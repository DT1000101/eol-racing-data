import { DATA } from "../../../hub/dataPaths";
import { PageHeader } from "../../../hub/PageHeader";
import { pageMeta } from "../../../hub/navConfig";

const meta = pageMeta("/attendance")!;

export function AttendancePage() {
  return (
    <div className="stats-page">
      <PageHeader title={meta.pageTitle} subtitle={meta.pageSubtitle} />
      <iframe
        className="stats-page__frame"
        src={DATA.rankings.stats}
        title="EOL attendance and league growth"
      />
    </div>
  );
}
