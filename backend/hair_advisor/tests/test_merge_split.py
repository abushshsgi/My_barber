from types import SimpleNamespace

from django.test import TestCase

from accounts.models import User
from hair_advisor.models import CandidateSubmission, ProductCandidate, ProductSubmission
from hair_advisor.verification_admin_views import (
    AdminProductCandidateMergeView,
    AdminProductCandidateSplitView,
)


def _user(name: str) -> User:
    return User.objects.create_user(
        username=name,
        email=f"{name}@t.local",
        phone=f"+9989{name[-8:].zfill(8)}",
        password="TestPass123!",
        role=User.Role.USER,
    )


class MergeSplitTests(TestCase):
    def setUp(self):
        self.u1, self.u2 = _user("mg1"), _user("mg2")

    def test_merge_combines_submissions(self):
        c1 = ProductCandidate.objects.create(proposed_brand="A", proposed_product_name="X")
        c2 = ProductCandidate.objects.create(proposed_brand="A", proposed_product_name="X2")
        s1 = ProductSubmission.objects.create(user=self.u1, barcode="111", status=ProductSubmission.Status.LINKED)
        s2 = ProductSubmission.objects.create(user=self.u2, barcode="111", status=ProductSubmission.Status.LINKED)
        CandidateSubmission.objects.create(candidate=c1, submission=s1, match_score=1.0)
        CandidateSubmission.objects.create(candidate=c2, submission=s2, match_score=1.0)

        req = SimpleNamespace(data={"target_candidate_id": str(c1.id)}, user=SimpleNamespace(id=1))
        view = AdminProductCandidateMergeView()
        resp = view.post(req, candidate_id=c2.id)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(CandidateSubmission.objects.filter(candidate=c1).count(), 2)
        c2.refresh_from_db()
        self.assertEqual(c2.status, ProductCandidate.Status.MERGED)

    def test_split_moves_submission(self):
        c = ProductCandidate.objects.create(proposed_brand="B", proposed_product_name="Y")
        s1 = ProductSubmission.objects.create(user=self.u1, status=ProductSubmission.Status.LINKED)
        s2 = ProductSubmission.objects.create(user=self.u2, status=ProductSubmission.Status.LINKED)
        CandidateSubmission.objects.create(candidate=c, submission=s1)
        CandidateSubmission.objects.create(candidate=c, submission=s2)

        req = SimpleNamespace(data={"submission_ids": [str(s2.id)]}, user=SimpleNamespace(id=1))
        view = AdminProductCandidateSplitView()
        resp = view.post(req, candidate_id=c.id)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(CandidateSubmission.objects.filter(candidate=c).count(), 1)
        new_id = resp.data.get("new_candidate_id")
        self.assertTrue(ProductCandidate.objects.filter(pk=new_id).exists())