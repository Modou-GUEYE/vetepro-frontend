import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toApiError } from '@/core/http/errors';
import { toast } from '@/shared/ui';
import { authService } from '../services/auth.service';
import { isPasswordValid } from './password';

export function useChangePasswordViewModel() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: () => authService.changePassword(current, password),
    onSuccess: () => { toast.success('Mot de passe modifié'); setCurrent(''); setPassword(''); setConfirm(''); setError(null); },
    onError: (e) => setError(toApiError(e).message),
  });

  const mismatch = confirm.length > 0 && password !== confirm;
  const sameAsCurrent = password.length > 0 && password === current;
  const canSubmit = current.length > 0 && isPasswordValid(password) && password === confirm && !sameAsCurrent && !change.isPending;

  return {
    current, setCurrent, password, setPassword, confirm, setConfirm,
    mismatch, sameAsCurrent, canSubmit, error, sending: change.isPending,
    submit: () => { setError(null); change.mutate(); },
  };
}
