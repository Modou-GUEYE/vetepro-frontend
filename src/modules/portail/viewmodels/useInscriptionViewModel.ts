import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toApiError } from '@/core/http/errors';
import { MoyenForm, Periode, Registration, emptyMoyen, moyenError } from '@/modules/abonnement/models/abonnement';
import { InfosForm, emptyInfos, infosSchema, stepOfError, usernameFrom } from '../models/portail';
import { portailService } from '../services/portail.service';
import { usePortalQuery } from './usePortalViewModel';

export type Step = 1 | 2 | 3 | 4;

/** Inscription en quatre étapes : package, informations professionnelles, finalisation (paiement et CGU), accès. */
export function useInscriptionViewModel(initial?: { packId: string; periode: Periode }) {
  const [params] = useSearchParams();
  const portal = usePortalQuery();
  const [step, setStep] = useState<Step>(initial ? 2 : 1);
  /** Le pack est déjà choisi (depuis le portail) : l'étape « Offre » est sautée (le code promo se saisit à l'étape paiement). */
  const [skipOffer, setSkipOffer] = useState(!!initial);
  const [packId, setPackId] = useState<string | null>(initial?.packId ?? params.get('pack'));
  const [periode, setPeriode] = useState<Periode>(initial?.periode ?? (params.get('periode') === 'annuel' ? 'annuel' : 'mensuel'));
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [packError, setPackError] = useState<string | null>(null);
  const [moyen, setMoyen] = useState<MoyenForm>(emptyMoyen());
  const [moyenErr, setMoyenErr] = useState<string | null>(null);
  const [cgu, setCgu] = useState(false);
  const [cguError, setCguError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Registration | null>(null);
  const form = useForm<InfosForm>({ resolver: zodResolver(infosSchema), defaultValues: emptyInfos() });

  // Le nom d'utilisateur suit le prénom et le nom tant que la personne ne l'a pas modifié elle-même.
  const [prenomW, nomW] = form.watch(['prenom', 'nom']);
  const identifiantTouched = !!form.formState.dirtyFields.identifiant;
  useEffect(() => { if (!identifiantTouched) form.setValue('identifiant', usernameFrom(prenomW, nomW)); }, [prenomW, nomW, identifiantTouched, form]);

  const pack = portal.data?.packs.find((p) => p.id === packId) ?? null;
  const quote = useQuery({ queryKey: ['portail-tarif', packId, periode, appliedCode], enabled: !!pack, retry: false, queryFn: () => portailService.quote(packId!, periode, appliedCode) });
  // Un code refusé (422) s'affiche sous le champ ; toute autre panne est déjà signalée par la notification d'erreur.
  const quoteFailure = quote.error ? toApiError(quote.error) : null;
  const quoteError = quoteFailure?.status === 422 ? quoteFailure.message : null;
  const quoteUnavailable = !!quoteFailure && quoteFailure.status !== 422;

  const register = useMutation({
    mutationFn: portailService.register,
    onSuccess: (r) => { setResult(r); setStep(4); },
    onError: (e) => {
      const err = toApiError(e);
      if (err.status !== 422) return;
      setError(err.message);
      const to = stepOfError(err.code);
      if (to === 1) setSkipOffer(false);
      setStep(to);
    },
  });

  const toInfos = () => { if (!pack) { setPackError('Sélectionnez un package'); return; } if (quoteError || quoteUnavailable) return; setPackError(null); setStep(2); };
  const toFinal = form.handleSubmit(() => { setError(null); setStep(3); });
  const submit = () => {
    setError(null);
    const m = moyenError(moyen);
    setMoyenErr(m);
    setCguError(cgu ? null : "L'acceptation des conditions générales d'utilisation est obligatoire");
    if (m || !cgu || !pack) return;
    register.mutate({ packId: pack.id, periode, codePromo: appliedCode, infos: form.getValues(), moyen, cgu });
  };

  return {
    portal: portal.data, loading: portal.isLoading, step, setStep, skipOffer, pack, packId, selectPack: (id: string) => { setPackId(id); setPackError(null); }, packError, periode, setPeriode,
    code, setCode, appliedCode, applyCode: () => setAppliedCode(code.trim()), clearCode: () => { setCode(''); setAppliedCode(''); }, quote: quote.data, quoteError, quoteUnavailable,
    form, toInfos, toFinal, moyen, setMoyen: (m: MoyenForm) => { setMoyen(m); setMoyenErr(null); }, moyenErr, cgu, setCgu: (v: boolean) => { setCgu(v); setCguError(null); }, cguError, error, submit, submitting: register.isPending, result,
  };
}
