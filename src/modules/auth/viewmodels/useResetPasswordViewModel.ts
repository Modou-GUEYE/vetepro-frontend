import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toApiError } from '@/core/http/errors';
import { authService } from '../services/auth.service';
import { isPasswordValid } from './password';

export function useResetPasswordViewModel() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState(false);

  const reset = useMutation({
    mutationFn: () => authService.resetPassword(token ?? '', password),
    onSuccess: () => setDone(true),
    onError: (e) => {
      const err = toApiError(e);
      if (err.code === 'link_expired') setExpired(true);
      else setError(err.message);
    },
  });

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = isPasswordValid(password) && password === confirm && !reset.isPending;

  return {
    password, setPassword, confirm, setConfirm,
    mismatch, canSubmit, error, done,
    invalidLink: !token || expired,
    sending: reset.isPending,
    submit: () => { setError(null); reset.mutate(); },
  };
}
