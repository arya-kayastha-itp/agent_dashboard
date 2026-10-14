import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveSubmissions, createSubmission, getSubmissions, reviewSubmission } from '../api/submissions.api';

export function useSubmissions(params = {}, { enabled = true } = {}) {
  return useQuery({ queryKey: ['submissions', params], queryFn: () => getSubmissions(params), enabled });
}

// Submitting changes an agent's pending-review badge; reviewing can also
// change the agent itself and its history — so all of those refresh.
function refreshAfterSubmission(queryClient) {
  ['submissions', 'agents', 'agentHistory', 'updates'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
}

function useSubmissionMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => refreshAfterSubmission(queryClient) });
}

// The new submission is written into the cached lists straight away, so the
// row's badge and "your last update" state change the moment it's sent; the
// refetch that follows settles exact counts.
export function useCreateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubmission,
    onSuccess: (submission) => {
      queryClient.setQueryData(['agents'], (agents) =>
        agents?.map((agent) => (agent.id === submission.agentId && !agent.pendingReviewCount ? { ...agent, pendingReviewCount: 1 } : agent)),
      );
      queryClient.setQueriesData(
        {
          queryKey: ['submissions'],
          predicate: ({ queryKey: [, params = {}] }) => !params.status && (!params.agentId || params.agentId === submission.agentId),
        },
        (mine) => mine && [submission, ...mine],
      );
      refreshAfterSubmission(queryClient);
    },
  });
}

export function useReviewSubmission() {
  return useSubmissionMutation(({ id, ...payload }) => reviewSubmission(id, payload));
}

export function useApproveSubmissions() {
  return useSubmissionMutation(approveSubmissions);
}
