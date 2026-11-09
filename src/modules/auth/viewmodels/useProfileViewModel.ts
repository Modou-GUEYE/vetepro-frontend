import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/ui';
import { ProfileForm, profileFormSchema } from '../models/auth';
import { authService } from '../services/auth.service';

/** Mon compte : e-mail et téléphone de l'utilisateur connecté (l'identifiant ne change pas). */
export function useProfileViewModel() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['profil'], queryFn: authService.profile });
  const form = useForm<ProfileForm>({ resolver: zodResolver(profileFormSchema), defaultValues: { email: '', telephone: '' } });
  useEffect(() => { if (query.data) form.reset({ email: query.data.email, telephone: query.data.telephone }); }, [query.data, form]);
  const save = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (d) => { form.reset({ email: d.email, telephone: d.telephone }); void queryClient.invalidateQueries({ queryKey: ['profil'] }); toast.success('Coordonnées enregistrées'); },
  });
  return { form, identifiant: query.data?.identifiant ?? '', saving: save.isPending, dirty: form.formState.isDirty, submit: form.handleSubmit((f) => save.mutate(f)) };
}
