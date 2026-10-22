import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2, Shield, Clock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const deletionFormSchema = z.object({
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  explanation: z.string().max(500, "Explanation must be less than 500 characters").optional(),
  confirmation: z.boolean().refine((val) => val === true, {
    message: "You must confirm this deletion request",
  }),
}).refine(
  (data) => data.email || data.phone,
  "Please provide either email or phone number"
);

type DeletionFormValues = z.infer<typeof deletionFormSchema>;

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "MySaloon — Account Deletion" },
      {
        name: "description",
        content:
          "Request deletion of your MySaloon account and associated personal data. GDPR and Google Play compliant.",
      },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useForm<DeletionFormValues>({
    resolver: zodResolver(deletionFormSchema),
    defaultValues: {
      email: "",
      phone: "",
      explanation: "",
      confirmation: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof deletionFormSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/account-deletion-request/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email || undefined,
          phone: values.phone || undefined,
          explanation: values.explanation || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to submit deletion request");
      }

      setSubmitSuccess(true);
      toast.success("Deletion request submitted successfully");
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Request Submitted</CardTitle>
              <CardDescription className="text-base">
                Your account deletion request has been received
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Processing Time</AlertTitle>
                <AlertDescription>
                  We will verify your identity and process your request within 7-14 business days. You will
                  receive a confirmation email once the deletion is complete.
                </AlertDescription>
              </Alert>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>What Happens Next</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                    <li>We will send a verification code to your provided email or phone</li>
                    <li>Once verified, your account and personal data will be permanently deleted</li>
                    <li>Bookings and transactions may be retained for legal compliance</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="pt-4 text-center">
                <Button
                  onClick={() => (window.location.href = "/")}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Account Deletion Request</h1>
          <p className="mt-2 text-muted-foreground">
            Request permanent deletion of your MySaloon account and personal data
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Data That Will Be Deleted</h3>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Personal profile information (name, email, phone, avatar)</li>
                <li>Saved addresses and family members</li>
                <li>Payment methods and wallet data</li>
                <li>Morf AI chat history and generated looks</li>
                <li>Uploaded photos and selfie data</li>
                <li>Session data and device information</li>
                <li>Notifications and preferences</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Data That May Be Retained</h3>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Booking records (required for legal and business purposes)</li>
                <li>Transaction history (financial compliance requirements)</li>
                <li>Reviews and ratings (may be anonymized for transparency)</li>
                <li>Analytics data (aggregated, non-personal)</li>
              </ul>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Identity Verification Required</AlertTitle>
              <AlertDescription>
                We will send a verification code to your provided email or phone number to confirm your
                identity before processing the deletion. This prevents unauthorized deletion requests.
              </AlertDescription>
            </Alert>

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Processing Time:</strong> Once verified, your account deletion will be processed
                within 7-14 business days. You will receive a confirmation email when the deletion is
                complete.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deletion Request Form</CardTitle>
            <CardDescription>
              Provide your account information and confirm your request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  {...form.register("email")}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Provide the email address associated with your account
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  {...form.register("phone")}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Provide your phone number if you registered via phone
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="explanation">Reason for Deletion (Optional)</Label>
                <Textarea
                  id="explanation"
                  placeholder="Tell us why you're leaving (optional)"
                  rows={3}
                  {...form.register("explanation")}
                  disabled={isSubmitting}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Your feedback helps us improve the service
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="confirmation"
                  checked={form.watch("confirmation")}
                  onCheckedChange={(checked) => form.setValue("confirmation", checked as boolean)}
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor="confirmation"
                  className="text-sm font-normal leading-relaxed cursor-pointer"
                >
                  I understand that this action is irreversible. I request permanent deletion of my
                  MySaloon account and all associated personal data. I acknowledge that some data may be
                  retained for legal compliance.
                </Label>
              </div>

              {form.formState.errors.confirmation && (
                <p className="text-sm text-destructive">{form.formState.errors.confirmation.message}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                variant="destructive"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Submit Deletion Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <p>Need help? Contact us at support@mysaloon.uz</p>
        </div>
      </div>
    </div>
  );
}
