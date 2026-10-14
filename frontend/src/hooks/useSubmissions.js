import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveSubmissions, createSubmission, getSubmissions, reviewSubmission } from '../api/submissions.api';

export function useSubmissions(params = {}, { enabled = true } = {}) {
  return useQuery({ queryKey: ['submissions', params], queryFn: () => getSubmissions(params), enabled });
}

// Submitting changes an agent's pending-review badge; reviewing can also
// change the agent itself and its history — so all of those refresh.
function useSubmissionMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      ['submissions', 'agents', 'agentHistory', 'updates'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}

export function useCreateSubmission() {
  return useSubmissionMutation(createSubmission);
}

export function useReviewSubmission() {
  return useSubmissionMutation(({ id, ...payload }) => reviewSubmission(id, payload));
}

export function useApproveSubmissions() {
  return useSubmissionMutation(approveSubmissions);
}
