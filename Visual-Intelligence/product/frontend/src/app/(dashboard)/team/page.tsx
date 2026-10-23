"use client";

import { BotFoundationPanel } from "@/components/team/BotFoundationPanel";
import styles from "@/components/team/TeamWorkroom.module.css";

export default function TeamPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.breadcrumb}>Workspace <span>/</span> Team</div>
        <header className={styles.pageHeader}>
          <div>
            <h1>Your creative colleague.</h1>
            <p>A place to give direction, preserve what matters, and review the work together.</p>
          </div>
          <div className={styles.pagePromise}>
            <span className={styles.promiseMark} aria-hidden="true">✳</span>
            <span>One persistent bot.<br />Every decision stays yours.</span>
          </div>
        </header>
        <BotFoundationPanel />
      </div>
    </main>
  );
}
