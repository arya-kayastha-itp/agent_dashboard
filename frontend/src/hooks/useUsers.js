import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, getUsers, sendNewLink, updateUser } from '../api/users.api';

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: getUsers });
}

function useUsersMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useCreateUser() {
  return useUsersMutation(createUser);
}

// A new link changes the account's link expiry shown on the Teams page.
export function useSendNewLink() {
  return useUsersMutation(sendNewLink);
}

export function useUpdateUser() {
  return useUsersMutation(({ id, ...payload }) => updateUser(id, payload));
}
