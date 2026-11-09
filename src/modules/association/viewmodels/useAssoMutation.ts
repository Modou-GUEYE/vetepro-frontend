import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toApiError } from '@/core/http/errors';
import { toast } from '@/shared/ui';

/**
 * Mutation du back-office : invalide les listes concernées et affiche le message d'une règle métier refusée.
 * Le 422 n'est pas affiché par l'intercepteur (le formulaire le montre) ; le 409 l'est déjà (toast global).
 */
export function useAssoMutation<V, R = unknown>(fn: (v: V) => Promise<R>, opts: { invalidate: string[][]; success?: string | ((r: R) => string | undefined); onDone?: (r: R) => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      for (const key of opts.invalidate) void queryClient.invalidateQueries({ queryKey: key });
      const msg = typeof opts.success === 'function' ? opts.success(r) : opts.success;
      if (msg) toast.success(msg);
      opts.onDone?.(r);
    },
    onError: (e) => { const err = toApiError(e); if (err.status === 422) toast.error(err.message); },
  });
}
