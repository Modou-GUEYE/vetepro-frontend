import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toApiError } from '@/core/http/errors';
import { ForgotForm, forgotFormSchema } from '../models/auth';
import { authService } from '../services/auth.service';

export function useForgotPasswordViewModel() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ForgotForm>({ resolver: zodResolver(forgotFormSchema), defaultValues: { email: '' } });

  const send = useMutation({
    mutationFn: (v: ForgotForm) => authService.forgotPassword(v.email),
    onSuccess: (_d, v) => setSentTo(v.email),
    onError: (e) => setError(toApiError(e).message),
  });

  return {
    form, sentTo, error, sending: send.isPending,
    submit: form.handleSubmit((v) => { setError(null); send.mutate(v); }),
  };
}
