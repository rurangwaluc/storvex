import EmployeesList from "../employees/EmployeesList";
import "./SettingsMembers.css";

export default function SettingsMembers() {
  return (
    <div className="svx-settings-team">
      <EmployeesList embedded />
    </div>
  );
}
