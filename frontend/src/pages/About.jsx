import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Info, Cpu, Shield, HelpCircle, BookOpen, Layers, Terminal, Sparkles, CheckCircle, ArrowRight, Server } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function About() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview & Mission", icon: <Info size={16} /> },
    { id: "workloads", label: "Cluster Workloads (9 Pods)", icon: <Server size={16} /> },
    { id: "features", label: "Platform Features", icon: <Sparkles size={16} /> },
    { id: "architecture", label: "Architecture & Agents", icon: <Cpu size={16} /> },
    { id: "usage", label: "How to Use", icon: <BookOpen size={16} /> },
    { id: "faq", label: "FAQ & Troubleshooting", icon: <HelpCircle size={16} /> },
  ];

  return (
    <div className="h-screen w-full flex flex-col bg-surface text-primary overflow-hidden font-sans select-none">
      {/* Top Header */}
      <div className="h-16 bg-surface/90 backdrop-blur-md border-b border-subtle px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-elevated border border-subtle text-accent-cyan hover:bg-accent-cyan/10 hover:border-accent-cyan/30 transition-all font-semibold text-sm">
            <ChevronLeft size={16} /> Dashboard
          </Link>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <BookOpen className="text-accent-violet" size={20} />
            <span className="font-display font-bold text-lg">PodMaster System Documentation</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 bg-accent-emerald/10 text-accent-emerald font-mono font-bold rounded-full border border-accent-emerald/20 shadow-2xs">v2.0 Enterprise Edition</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-surface border-b border-subtle px-6 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none shadow-xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3.5 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-accent-violet text-accent-violet bg-accent-violet/5 font-bold"
                : "border-transparent text-muted hover:text-primary hover:bg-elevated/50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto px-6 py-10 pb-32 max-w-6xl mx-auto w-full scrollbar-thin">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.section
              key="overview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-10 font-sans"
            >
              <div className="bg-gradient-to-r from-accent-cyan/10 via-accent-violet/10 to-accent-emerald/10 p-8 sm:p-12 rounded-3xl border border-subtle shadow-md relative overflow-hidden">
                <div className="max-w-3xl space-y-4 font-sans">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-subtle text-xs font-bold text-accent-violet shadow-sm tracking-wider uppercase font-display">
                    <Sparkles size={14} /> Plain English Platform Overview
                  </div>
                  <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-primary">
                    Autonomous Site Reliability Engineering (SRE) for Kubernetes
                  </h1>
                  <p className="text-secondary text-base sm:text-lg leading-relaxed font-sans font-medium">
                    PodMaster acts as a round-the-clock virtual systems engineer for your cloud infrastructure. It continuously monitors the internal health of your servers using lightweight Linux kernel sensors, analyzes resource spikes with advanced Artificial Intelligence, and automatically applies corrective fixes before your users ever experience downtime or slow performance.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-6 font-sans">
                {[
                  { title: "Direct Kernel Monitoring", desc: "Inspects server memory, network traffic, and hard disk operations directly at the Linux operating system level. This completely eliminates the sluggishness caused by traditional monitoring agents.", color: "text-accent-cyan" },
                  { title: "Six Autonomous AI Agents", desc: "A team of six specialized software robots continuously watch your servers. If a processor overheats or memory runs out, the responsible robot steps in immediately to stabilize the system.", color: "text-accent-violet" },
                  { title: "Human-Friendly AI Analysis", desc: "Instead of forcing you to decipher complicated technical charts during an emergency, PodMaster instantly summarizes complex server crashes into simple, easy-to-read English paragraphs.", color: "text-accent-emerald" },
                ].map((item, idx) => (
                  <div key={idx} className="bg-surface border border-subtle p-6 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-3 font-sans">
                    <h3 className={`text-xl font-bold font-display ${item.color}`}>{item.title}</h3>
                    <p className="text-secondary text-sm leading-relaxed font-sans font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-surface border border-subtle rounded-2xl p-8 space-y-6 shadow-sm font-sans font-medium">
                <h2 className="text-2xl font-bold font-display text-primary">Why We Built PodMaster</h2>
                <p className="text-secondary leading-relaxed">
                  Modern cloud applications consist of numerous interconnected microservices running across multiple servers. When something goes wrong—like a sudden surge in user logins or a database slowdown—engineers are often overwhelmed by a chaotic flood of disconnected error logs and complicated graphs. PodMaster solves this by instantly connecting the dots. It organizes your server network into a beautiful interactive map, tracks reliability goals in real time, and allows you to ask direct questions in plain English to resolve issues in seconds.
                </p>
              </div>
            </motion.section>
          )}

          {activeTab === "workloads" && (
            <motion.section
              key="workloads"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8 font-sans"
            >
              <div className="border-b border-subtle pb-6 space-y-2 font-sans">
                <h1 className="text-3xl font-extrabold font-display text-primary">Cluster Workloads: Why Exactly 9 Pods?</h1>
                <p className="text-secondary text-base">
                  When you look at the top navigation bar, you will notice exactly <strong>9 Active Pods (Containers)</strong> being monitored. These represent the complete microservice architecture of our demo University Campus Cloud System. Here is the full breakdown of every server running in your environment:
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 font-sans">
                {/* Frontend Namespace */}
                <div className="bg-surface border border-subtle p-6 rounded-2xl shadow-sm space-y-4 font-sans">
                  <div className="px-3 py-1 bg-accent-violet/10 border border-accent-violet/30 rounded-lg text-accent-violet font-bold text-xs uppercase tracking-wider inline-block">
                    University Frontend (4 Pods)
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Manages web interfaces, student logins, and real-time SMS/Email notification alerts across campus.
                  </p>
                  <ul className="space-y-3 font-mono text-xs">
                    <li className="p-3 bg-elevated border border-subtle rounded-xl flex justify-between items-center shadow-2xs">
                      <span className="font-bold text-primary">student-portal-0</span>
                      <span className="text-[10px] text-accent-emerald font-sans px-2 py-0.5 bg-accent-emerald/10 rounded">Active</span>
                    </li>
                    <li className="p-3 bg-elevated border border-subtle rounded-xl flex justify-between items-center shadow-2xs">
                      <span className="font-bold text-primary">student-portal-1</span>
                      <span className="text-[10px] text-accent-emerald font-sans px-2 py-0.5 bg-accent-emerald/10 rounded">Active</span>
                    </li>
                    <li className="p-3 bg-elevated border border-subtle rounded-xl flex justify-between items-center shadow-2xs">
                      <span className="font-bold text-primary">notification-service-0</span>
                      <span className="text-[10px] text-accent-emerald font-sans px-2 py-0.5 bg-accent-emerald/10 rounded">Active</span>
                    </li>
                    <li className="p-3 bg-elevated border border-subtle rounded-xl flex justify-between items-center shadow-2xs">
                      <span className="font-bold text-primary">notification-service-1</span>
                      <span className="text-[10px] text-accent-emerald font-sans px-2 py-0.5 bg-accent-emerald/10 rounded">Active</span>
                    </li>
                  </ul>
                </div>

                {/* Backend Namespace */}
                <div className="bg-surface border border-subtle p-6 rounded-2xl shadow-sm space-y-4 font-sans">
                  <div className="px-3 py-1 bg-accent-cyan/10 border border-accent-cyan/30 rounded-lg text-accent-cyan font-bold text-xs uppercase tracking-wider inline-block">
                    University Backend (4 Pods)
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Handles heavy data processing, exam grading calculations, and student classroom attendance tracking.
                  </p>
                  <ul className="space-y-3 font-mono text-xs">
                    <li className="p-3 bg-elevated border border-subtle rounded-xl flex justify-between items-center shadow-2xs">
                      <span className="font-bold text-primary">attendance-service-0</span>
                      <span className="text-[10px] text-accent-emerald font-sans px-2 py-0.5 bg-accent-emerald/10 rounded">Active</span>
                    </li>
                    <li className="p-3 bg-elevated border border-subtle rounded-xl flex justify-between items-center shadow-2xs">
                      <span className="font-bold text-primary">attendance-service-1</span>
                      <span className="text-[10px] text-accent-emerald font-sans px-2 py-0.5 bg-accent-emerald/10 rounded">Active</span>
                    </li>
                    <li className="p-3 bg-elevated border border-subtle rounded-xl flex justify-between items-center shadow-2xs">
                      <span className="font-bold text-primary">result-service-0</span>
                      <span className="text-[10px] text-accent-amber font-sans px-2 py-0.5 bg-accent-amber/10 rounded">Degraded</span>
                    </li>
                    <li className="p-3 bg-elevated border border-subtle rounded-xl flex justify-between items-center shadow-2xs">
                      <span className="font-bold text-primary">result-service-1</span>
                      <span className="text-[10px] text-accent-emerald font-sans px-2 py-0.5 bg-accent-emerald/10 rounded">Active</span>
                    </li>
                  </ul>
                </div>

                {/* Data Namespace */}
                <div className="bg-surface border border-subtle p-6 rounded-2xl shadow-sm space-y-4 font-sans">
                  <div className="px-3 py-1 bg-accent-emerald/10 border border-accent-emerald/30 rounded-lg text-accent-emerald font-bold text-xs uppercase tracking-wider inline-block">
                    University Data (1 Pod)
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    The master high-performance database holding all student records, course catalogs, and financial accounts.
                  </p>
                  <ul className="space-y-3 font-mono text-xs">
                    <li className="p-3 bg-elevated border border-subtle rounded-xl flex justify-between items-center shadow-2xs">
                      <span className="font-bold text-primary">postgres-db-0</span>
                      <span className="text-[10px] text-accent-emerald font-sans px-2 py-0.5 bg-accent-emerald/10 rounded">Active</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-elevated border border-subtle font-sans text-sm text-secondary leading-relaxed shadow-inner">
                <span className="font-bold text-primary">Summary:</span> 4 Frontend Pods + 4 Backend Pods + 1 Database Pod = <strong>Exactly 9 Pods</strong>. This complete multi-tier setup provides a perfect, realistic playground to test server monitoring and automated recovery without overwhelming your computer.
              </div>
            </motion.section>
          )}

          {activeTab === "features" && (
            <motion.section
              key="features"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8 font-sans"
            >
              <div className="border-b border-subtle pb-6 space-y-2 font-sans">
                <h1 className="text-3xl font-extrabold font-display text-primary">Platform Features Explained in Plain English</h1>
                <p className="text-secondary text-base">Explore the core tools and interactive panels available on your dashboard.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 font-sans">
                {[
                  { name: "1. Golden Signals Strip", desc: "Tracks the four essential vital signs of your applications: Response Speed (Latency), User Traffic (Requests per second), Error Rate, and Hardware Capacity (Saturation)." },
                  { name: "2. Cluster Explorer Tree", desc: "An easy-to-use directory tree that organizes all your applications and servers, allowing you to instantly search for any specific service in seconds." },
                  { name: "3. Service Topology Map", desc: "An interactive visual map showing how every server talks to each other in real time, highlighting slow network connections and secure communication paths." },
                  { name: "4. Reliability Targets & Error Budgets", desc: "Tracks your uptime commitments (like guaranteeing your portal is online 99.9% of the time) and alerts you if downtime is eating into your safety margin." },
                  { name: "5. Automated Alert Rules", desc: "Smart warning alarms that automatically notify engineers or trigger self-healing routines whenever server performance drops below acceptable levels." },
                  { name: "6. Logs & Metrics Time Machine", desc: "Instantly matches server error logs with exact timestamps of processor spikes, showing you exactly what software error caused the server overload." },
                  { name: "7. Cluster Hotspots Summary", desc: "A prioritized ranking card that instantly highlights your most troubled servers, saving you from digging through dozens of separate charts." },
                  { name: "8. Natural Language Search Bar", desc: "A search box where you can type questions exactly as you would speak, such as 'Why is the grading service restarting?' to get immediate AI answers." },
                  { name: "9. Instant Incident Reports", desc: "With a single click, generate fully formatted, professional executive incident summaries and step-by-step repair guides for your team." },
                  { name: "10. Department Cost Breakdown", desc: "Tracks how much server hardware each department is consuming and estimates your monthly cloud hosting bills automatically." },
                  { name: "11. Predictive Crash Warnings", desc: "Uses machine learning to forecast memory usage trends, alerting you up to two hours before a server runs out of RAM and crashes." },
                  { name: "12. Service Cascading Matrix", desc: "Analyzes mathematical relationships between different applications to warn you if one failing server is about to bring down connected systems." },
                  { name: "13. Controlled Chaos Sandbox", desc: "A safe testing ground where engineers can intentionally inject processor spikes or memory leaks to verify that automated self-healing mechanisms work perfectly." },
                  { name: "14. AI Subsystem Performance", desc: "Monitors the speed and efficiency of the underlying Artificial Intelligence model, ensuring your virtual assistant is always lightning fast." },
                  { name: "15. Live System Activity Audit", desc: "A real-time ticker stream displaying every single automated agent action, system recovery event, and configuration update in one place." }
                ].map((feature, i) => (
                  <div key={i} className="bg-surface border border-subtle p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between font-sans">
                    <div className="space-y-2 font-sans font-medium">
                      <h3 className="text-lg font-bold font-display text-accent-violet">{feature.name}</h3>
                      <p className="text-secondary text-sm leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {activeTab === "architecture" && (
            <motion.section
              key="architecture"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8 font-sans"
            >
              <div className="border-b border-subtle pb-6 space-y-2 font-sans">
                <h1 className="text-3xl font-extrabold font-display text-primary">How the Software Works Under the Hood</h1>
                <p className="text-secondary text-base">A simple breakdown of our automated virtual engineering team and data pipeline.</p>
              </div>

              <div className="bg-surface border border-subtle rounded-3xl p-8 shadow-sm space-y-6 font-sans">
                <h2 className="text-2xl font-bold font-display text-primary">The Six Specialized AI Robots</h2>
                <div className="grid md:grid-cols-2 gap-6 font-sans">
                  {[
                    { agent: "CPU Agent (Processor Robot)", metric: "Processor Overheating", desc: "Continuously monitors processor usage across all applications, automatically scaling server capacity if a program gets stuck in an infinite calculation loop." },
                    { agent: "Memory Agent (RAM Robot)", metric: "Memory Leaks", desc: "Tracks memory consumption trends over time to identify software programs that fail to release unused RAM, preventing unexpected memory exhaustion crashes." },
                    { agent: "Network Agent (Network Robot)", metric: "Network Traffic", desc: "Watches the speed and volume of data flowing between servers, immediately flagging slow communication links or dropped network packets." },
                    { agent: "Storage Agent (Hard Disk Robot)", metric: "Storage Space", desc: "Ensures your database and storage drives never run out of disk space, preventing applications from freezing due to lack of storage." },
                    { agent: "LogIO Agent (Error Log Robot)", metric: "Application Errors", desc: "Scans raw application error streams for sudden surges in software crash notices or database connection failures." },
                    { agent: "Scheduling Agent (Server Placement Robot)", metric: "Server Allocation", desc: "Ensures every new application container is successfully assigned to a healthy server with enough available processor and memory capacity." },
                  ].map((a, idx) => (
                    <div key={idx} className="bg-elevated border border-subtle p-5 rounded-xl space-y-2 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-accent-cyan font-mono text-sm">{a.agent}</span>
                        <span className="text-xs px-2.5 py-1 rounded bg-surface border border-subtle text-muted font-sans font-semibold">{a.metric}</span>
                      </div>
                      <p className="text-secondary text-xs leading-relaxed font-sans font-medium">{a.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-subtle rounded-3xl p-8 shadow-sm space-y-6 font-sans font-medium">
                <h2 className="text-2xl font-bold font-display text-primary">The Lightning-Fast Data Pipeline</h2>
                <div className="space-y-4 font-sans text-sm font-medium">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-elevated border border-subtle shadow-2xs">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-cyan/10 text-accent-cyan flex items-center justify-center font-bold font-mono">1</span>
                    <div>
                      <div className="font-bold text-primary text-base">Kernel Sensors & Data Collection</div>
                      <div className="text-xs text-secondary mt-1">Lightweight operating system sensors collect server health statistics every 10 seconds without slowing down your active user programs.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-elevated border border-subtle shadow-2xs">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-violet/10 text-accent-violet flex items-center justify-center font-bold font-mono">2</span>
                    <div>
                      <div className="font-bold text-primary text-base">In-Memory Analysis Engine</div>
                      <div className="text-xs text-secondary mt-1">All data is instantly processed in high-speed computer memory, organizing network graphs and vital signs in milliseconds.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-elevated border border-subtle shadow-2xs">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-emerald/10 text-accent-emerald flex items-center justify-center font-bold font-mono">3</span>
                    <div>
                      <div className="font-bold text-primary text-base">Virtual SRE Engine & Secure Database</div>
                      <div className="text-xs text-secondary mt-1">Evaluates active warning rules, stores snapshot records into a secure local database, and dispatches AI robots to investigate issues.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-elevated border border-subtle shadow-2xs">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-amber/10 text-accent-amber flex items-center justify-center font-bold font-mono">4</span>
                    <div>
                      <div className="font-bold text-primary text-base">Live Dashboard Broadcast</div>
                      <div className="text-xs text-secondary mt-1">Pushes sub-second visual updates directly to your web browser dashboard so you see changes instantly in real time.</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === "usage" && (
            <motion.section
              key="usage"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8 font-sans font-medium"
            >
              <div className="border-b border-subtle pb-6 space-y-2 font-sans">
                <h1 className="text-3xl font-extrabold font-display text-primary">Simple Step-by-Step Navigation Guide</h1>
                <p className="text-secondary text-base">How to get the most out of your PodMaster dashboard in daily operations.</p>
              </div>

              <div className="space-y-6 font-sans font-medium">
                {[
                  { step: "Step 1: Check the Vital Signs Strip", desc: "When you first open the dashboard, glance at the top banner. Notice the overall system health grade and network speed. You can easily switch between different views using the top menu tabs." },
                  { step: "Step 2: View Server Connections on the Map", desc: "Click the 'Topology & Hotspots' tab. You will see an interactive map showing how your student portal communicates with the database and grading services in real time." },
                  { step: "Step 3: Chat with Your Virtual AI Assistant", desc: "Use the search bar at the very top of the page. Ask direct questions like 'Why is the grading service running slow?' or 'Which server is consuming the most memory?' to get an instant explanation." },
                  { step: "Step 4: Generate Professional Incident Summaries", desc: "If an outage occurs, switch to the 'Alerts & Timeline' tab and click the report generation button. The system will create a beautiful, professional summary report detailing exactly what happened." },
                  { step: "Step 5: Experiment in the Chaos Sandbox", desc: "Switch to the 'Chaos Sandbox' tab to practice handling server emergencies. You can safely simulate a processor spike on the student portal and watch how the AI robots automatically fix the issue within 90 seconds." }
                ].map((item, i) => (
                  <div key={i} className="bg-surface border border-subtle p-6 rounded-2xl shadow-sm space-y-3 font-sans">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-accent-violet/10 text-accent-violet flex items-center justify-center font-bold font-mono text-sm">{i + 1}</span>
                      <h3 className="text-xl font-bold font-display text-primary">{item.step}</h3>
                    </div>
                    <p className="text-secondary text-sm sm:text-base pl-11 leading-relaxed font-sans font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {activeTab === "faq" && (
            <motion.section
              key="faq"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8 font-sans font-medium"
            >
              <div className="border-b border-subtle pb-6 space-y-2 font-sans">
                <h1 className="text-3xl font-extrabold font-display text-primary">Frequently Asked Questions & Answers</h1>
                <p className="text-secondary text-base">Simple answers to common questions about system setup and capabilities.</p>
              </div>

              <div className="space-y-4 font-sans font-medium">
                {[
                  { q: "What happens if the main monitoring server is unreachable?", a: "PodMaster includes an automated backup simulation mode. If the live server is temporarily unreachable, the system instantly switches to a realistic demo mode so your dashboard remains fully functional and interactive at all times." },
                  { q: "Can I receive automated notification alarms on Slack or email?", a: "Absolutely! In the 'Alerts & Timeline' tab, you can easily configure custom notification links to send instant messages directly to your team's communication channels whenever server issues arise." },
                  { q: "Does PodMaster require heavy local Artificial Intelligence models?", a: "No! If you do not have large AI models installed locally on your machine, PodMaster automatically uses built-in smart templates and expert rules, guaranteeing that your dashboard never freezes or breaks." },
                  { q: "How does the system know when two server issues are related?", a: "The software continuously tracks the processor and memory curves of every active server. It uses mathematical correlation formulas to instantly identify when a database slowdown is directly causing a bottleneck on the front-end web portal." },
                  { q: "Can PodMaster monitor any cloud server environment?", a: "Yes. It connects using standard, highly secure cloud credentials, making it perfectly compatible with all major cloud providers including Amazon Web Services (AWS), Google Cloud (GCP), and Microsoft Azure." }
                ].map((faq, idx) => (
                  <div key={idx} className="bg-surface border border-subtle p-6 rounded-2xl shadow-sm space-y-3 font-sans">
                    <h3 className="text-lg font-bold font-display text-primary flex items-start gap-2.5 font-display">
                      <HelpCircle className="text-accent-cyan mt-0.5 shrink-0" size={20} />
                      {faq.q}
                    </h3>
                    <p className="text-secondary text-sm sm:text-base pl-7 leading-relaxed font-sans font-medium">{faq.a}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
