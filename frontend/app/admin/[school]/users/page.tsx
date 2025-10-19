export default function AdminUsers({ params }: { params: { school: string } }) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-2">Users & Roles</h1>
        <p className="text-sm text-gray-600">Owner, Admin, Dept Admin, Analyst, Student, Applicant, Parent.</p>
        <div className="mt-4 text-sm text-gray-500">Coming soon: invite via email, assign department, RBAC.</div>
      </div>
    );
  }
  