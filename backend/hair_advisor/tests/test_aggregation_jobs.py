from django.test import TestCase

from accounts.models import User
from hair_advisor.models import ProductAggregationJob, ProductSubmission
from hair_advisor.tasks import defer_aggregate_submission, process_aggregation_job, process_pending_aggregation_jobs


def _user(name: str) -> User:
    return User.objects.create_user(
        username=name,
        email=f"{name}@t.local",
        phone=f"+9989{name[-8:].zfill(8)}",
        password="TestPass123!",
        role=User.Role.USER,
    )


class AggregationJobTests(TestCase):
    def test_job_created_and_processed(self):
        u = _user("aggjob1")
        sub = ProductSubmission.objects.create(
            user=u,
            barcode="5901234123461",
            submitted_brand="X",
            submitted_product_name="Y",
            user_corrected_ingredients=["Aqua"],
            status=ProductSubmission.Status.SUBMITTED,
        )
        defer_aggregate_submission(sub.pk)
        self.assertTrue(ProductAggregationJob.objects.filter(submission=sub).exists())
        self.assertTrue(process_aggregation_job(sub.pk))
        job = ProductAggregationJob.objects.get(submission=sub)
        self.assertEqual(job.status, ProductAggregationJob.Status.DONE)

    def test_pending_processor(self):
        u = _user("aggjob2")
        sub = ProductSubmission.objects.create(
            user=u,
            barcode="5901234123462",
            user_corrected_ingredients=["Aqua", "Glycerin"],
            status=ProductSubmission.Status.SUBMITTED,
        )
        ProductAggregationJob.objects.create(submission=sub, status=ProductAggregationJob.Status.PENDING)
        n = process_pending_aggregation_jobs(limit=5)
        self.assertGreaterEqual(n, 1)