import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTeamMember, deleteTeamMember, getTeamMembers } from '../api/teamMembers.api';

export function useTeamMembers() {
  return useQuery({ queryKey: ['teamMembers'], queryFn: getTeamMembers });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTeamMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] }),
  });
}

// Removing a member also unassigns them everywhere and deletes their account,
// so the agent lists (which show assignees) and accounts are stale too, not
// just the roster.
export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTeamMember,
    onSuccess: () => {
      ['teamMembers', 'agents', 'users'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}
