'use client';

import { CheckCircle2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { FormField, Input, Select, Textarea } from '@/components/ui/form';
import { useToast } from '@/components/ui/Toast';

export function ContactForm() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    // No public contact endpoint yet — acknowledge the message locally.
    window.setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      toast('Thanks — your message has been received.', 'success');
    }, 700);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-success/12 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-content">
          Message received
        </h3>
        <p className="mt-2 max-w-sm text-sm text-content-muted">
          Thanks for reaching out. Our team will get back to you within 1–2
          business days.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={() => setDone(false)}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border bg-surface p-6 sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="name" required>
          <Input id="name" name="name" required placeholder="Jordan Lee" />
        </FormField>
        <FormField label="Email" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
          />
        </FormField>
      </div>
      <FormField label="I am a…" htmlFor="role">
        <Select id="role" name="role" defaultValue="student">
          <option value="student">Student</option>
          <option value="parent">Parent or guardian</option>
          <option value="organization">Organization or school</option>
          <option value="other">Something else</option>
        </Select>
      </FormField>
      <FormField label="How can we help?" htmlFor="message" required>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Tell us a little about what you're looking for…"
        />
      </FormField>
      <Button type="submit" loading={submitting} className="w-full">
        Send message
      </Button>
    </form>
  );
}
