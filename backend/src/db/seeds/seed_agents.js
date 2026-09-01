exports.seed = async function (knex) {
  await knex('agent_updates').del();
  await knex('agents').del();

  const agents = [
    {
      name: 'Support Triage Agent',
      description: 'Classifies and routes inbound support tickets.',
      assigned_to: 'Arya Kayastha',
      eta: '2026-09-15',
      current_status: 'In Progress',
      current_progress: 60,
      current_status_description: 'Intent classification working, routing rules in progress.',
    },
    {
      name: 'Invoice Extraction Agent',
      description: 'Extracts line items from vendor invoices into structured data.',
      assigned_to: 'Priya Sharma',
      eta: '2026-09-01',
      current_status: 'Blocked',
      current_progress: 35,
      current_status_description: 'Waiting on sample invoice set from finance team.',
    },
    {
      name: 'Meeting Notes Agent',
      description: 'Summarizes meeting transcripts and extracts action items.',
      assigned_to: 'Jordan Lee',
      eta: '2026-08-30',
      current_status: 'Completed',
      current_progress: 100,
      current_status_description: 'Shipped to pilot users.',
    },
  ];

  const inserted = await knex('agents').insert(agents).returning(['id', 'current_status', 'current_progress', 'current_status_description']);

  const today = new Date();
  const historyRows = [];
  inserted.forEach((agent) => {
    for (let daysAgo = 4; daysAgo >= 0; daysAgo -= 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      const progress = Math.max(0, agent.current_progress - daysAgo * 10);
      historyRows.push({
        agent_id: agent.id,
        update_date: d.toISOString().slice(0, 10),
        status: daysAgo === 0 ? agent.current_status : 'In Progress',
        progress: daysAgo === 0 ? agent.current_progress : progress,
        status_description: daysAgo === 0 ? agent.current_status_description : 'Daily progress update.',
        source: 'manual',
      });
    }
  });

  await knex('agent_updates').insert(historyRows);
};
