// Re-mounts on every navigation inside the dashboard, giving each page a short entrance.
export default function DashboardTemplate({ children }) {
  return <div className="page-enter">{children}</div>;
}
