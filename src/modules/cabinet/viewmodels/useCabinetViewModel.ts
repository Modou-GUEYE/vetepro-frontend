import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { useSessionStore } from '@/core/auth/session.store';
import { toast } from '@/shared/ui';
import { authService } from '@/modules/auth/services/auth.service';
import { CabinetForm, cabinetFormSchema, formFromDto, logoProblem } from '../models/cabinet';
import { cabinetService } from '../services/cabinet.service';

export function useCabinetViewModel() {
  const queryClient = useQueryClient();
  const can = useCan();
  const setAccess = useSessionStore((s) => s.setAccess);
  const query = useQuery({ queryKey: ['cabinet'], queryFn: cabinetService.get });
  const canEdit = can('referentiels', 'update');
  const form = useForm<CabinetForm>({ resolver: zodResolver(cabinetFormSchema), defaultValues: { nom: '', ordre: '', adresse: '', telephone: '', email: '', logo: null, twofaObligatoire: false } });

  useEffect(() => { if (query.data) form.reset(formFromDto(query.data)); }, [query.data, form]);

  const save = useMutation({
    mutationFn: cabinetService.save,
    onSuccess: async (d) => {
      form.reset(formFromDto(d));
      void queryClient.invalidateQueries({ queryKey: ['cabinet'] });
      void queryClient.invalidateQueries({ queryKey: ['2fa'] });
      setAccess(await authService.me()); // le nom du cabinet s'affiche dans Mon compte
      toast.success('Informations du cabinet enregistrées');
    },
  });

  const chooseLogo = (file: File | undefined) => {
    if (!file) return;
    const problem = logoProblem(file);
    if (problem) { toast.warning(problem); return; }
    const reader = new FileReader();
    reader.onload = () => form.setValue('logo', String(reader.result), { shouldDirty: true });
    reader.readAsDataURL(file);
  };

  return {
    form, loading: query.isLoading, canEdit, saving: save.isPending, dirty: form.formState.isDirty,
    submit: form.handleSubmit((f) => save.mutate(f)),
    cancel: () => query.data && form.reset(formFromDto(query.data)),
    chooseLogo, removeLogo: () => form.setValue('logo', null, { shouldDirty: true }),
  };
}
