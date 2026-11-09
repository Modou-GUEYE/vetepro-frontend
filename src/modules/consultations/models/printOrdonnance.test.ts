import { describe, expect, it } from 'vitest';
import { ConsultationDetail } from './consultation';
import { ordonnanceHtml } from './printOrdonnance';

const c: ConsultationDetail = {
  id: '3', date: '2025-03-08', patient: { id: '4', nom: 'Bouba', espece: 'Chien', matricule: 'PAT-0004' }, proprietaire: { id: '1', nom: 'Moussa <i>Diallo</i>', telephone: '', email: '' },
  motif: '', diagnostic: 'Gastro-entérite aiguë', service: 'Urgence', veterinaire: 'Dr Sy', nbMedicaments: 3, ordonnanceNumero: 'ORD-0003', facture: null, examen: '', notes: '<script>x</script>',
  serviceId: '9', servicePrix: 12000,
  stock: [{ articleId: '2', nom: 'Amoxicilline vét. 250mg', unite: 'Comprimés', quantite: 6, prixUnitaire: 200, dosage: '', posologie: '1 comprimé matin et soir' }],
  externes: [{ nom: 'Lactobacillus vét.', quantite: 1, dosage: '1 g', posologie: '2 fois par jour' }], facturePropose: [],
};

describe('ordonnance imprimable', () => {
  it('sépare les médicaments dispensés et ceux à obtenir en pharmacie', () => {
    const html = ordonnanceHtml(c);
    expect(html).toContain('Médicaments dispensés par le cabinet');
    expect(html).toContain('Amoxicilline vét. 250mg (Comprimés)');
    expect(html).toContain('Médicaments à obtenir en pharmacie');
    expect(html).toContain('Lactobacillus vét.');
    expect(html).toContain('ORD-0003');
  });
  it("n'affiche pas une section vide", () => {
    expect(ordonnanceHtml({ ...c, externes: [] })).not.toContain('à obtenir en pharmacie');
    expect(ordonnanceHtml({ ...c, stock: [] })).not.toContain('dispensés par le cabinet');
  });
  it('échappe les textes saisis', () => {
    const html = ordonnanceHtml(c);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<i>Diallo</i>');
  });
});
