import { useQuery } from '@tanstack/react-query';
import { administrationService } from '../services/administration.service';

export const useProfilesQuery = () => useQuery({ queryKey: ['profiles'], queryFn: administrationService.listProfiles });
