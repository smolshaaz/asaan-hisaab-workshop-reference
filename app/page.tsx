import WorkspaceLayout from "./(workspace)/layout";
import DashboardPage from "./(workspace)/dashboard/page";

export default function Home() {
  return (
    <WorkspaceLayout>
      <DashboardPage />
    </WorkspaceLayout>
  );
}
