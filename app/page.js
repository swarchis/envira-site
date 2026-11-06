import Scene from "@/components/Scene";

// Booking link used by the header button and both demo forms.
// Replace with your Cal.com / Calendly link; the email field is passed through as a prefill.
const BOOKING_URL = "https://cal.com";

// Static export base path (GitHub Pages); files in public/ are served under it.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

function DemoForm() {
  return (
    <form className="demo" action={BOOKING_URL} method="get" target="_blank">
      <input
        type="email"
        name="email"
        placeholder="Work email"
        autoComplete="email"
        required
        aria-label="Work email"
      />
      <button type="submit">Book a demo</button>
    </form>
  );
}

// Splits a headline into words so the chapter panes can stagger them (scene.js sets --d per pane).
function Words({ children }) {
  return children.split(" ").map((w, i) => (
    <span className="w" style={{ "--i": i }} key={i}>
      {w}{" "}
    </span>
  ));
}

const LABEL = {
  fontSize: 9,
  letterSpacing: 1.4,
  fill: "#A39888",
  fontFamily: "Figtree,sans-serif",
};

export default function Home() {
  return (
    <>
      <canvas id="gl" aria-hidden="true"></canvas>
      <div id="sky" aria-hidden="true"></div>

      <div className="frame" aria-hidden="true">
        <div className="panel"></div>
      </div>

      <header className="pill">
        <span className="mark">Envira</span>
        <a className="btn" href={BOOKING_URL} target="_blank" rel="noopener">
          Book a call
        </a>
      </header>

      <div id="tip" role="status" aria-live="polite">
        <div className="hd lab">
          <span id="tipn"></span>
          <span id="tips"></span>
        </div>
        <div className="bd" id="tipb"></div>
      </div>

      <main id="story">
        <section className="beat" id="hero" data-i="0">
          <div className="copy">
            <h1>
              Training grounds for AI chip engineers<span className="dot">.</span>
            </h1>
            <p>Simulator-checked RL environments for hardware design.</p>
            <DemoForm />
            <div className="cue lab">
              <i></i>Scroll to trace
            </div>
          </div>
        </section>

        {/* Chapter I: stops 1-2 share one pinned board; each scroll advances a stage. */}
        <section className="chapter" id="chA" data-from="1" data-to="2" style={{ "--n": 2 }}>
          <div className="pin">
            <div className="copy board dossier">
              <div className="bhd">
                <span className="lab">
                  <em>I</em> · The task
                </span>
                <span className="lab ctr">
                  <b className="cur">01</b> / 02
                </span>
              </div>
              <div className="bbody">
                <ol className="rail">
                  <li data-k="0">
                    <span>01</span>Seed
                  </li>
                  <li data-k="1">
                    <span>02</span>Bug
                  </li>
                </ol>
                <div className="panes">
                  <div className="pane" data-k="0">
                    <span className="ghost" aria-hidden="true">01</span>
                    <h2>
                      <Words>It starts with real hardware.</Words>
                    </h2>
                    <p>Open-source Verilog. FIFOs, UARTs, timers.</p>
                  </div>
                  <div className="pane" data-k="1">
                    <span className="ghost" aria-hidden="true">02</span>
                    <h2>
                      <Words>One subtle bug.</Words>
                    </h2>
                    <div className="card">
                      <div className="diff">
                        <span className="m">−</span>
                        <span className="m">full = (count == DEPTH);</span>
                        <span className="r">+</span>
                        <span>
                          full = (count == DEPTH <u>- 1</u>);
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bft">
                <span className="bar">
                  <i></i>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="beat" data-i="3" data-pos="BL">
          <div className="copy">
            <span className="lab">
              <em>03</em> · Agent
            </span>
            <h2>An agent fixes it.</h2>
            <p>
              The agent gets the spec and the buggy design, then works the problem step by step in
              a real toolchain.
            </p>
            <ol className="steps" id="steps">
              <li>
                <span>1</span>Read
              </li>
              <li>
                <span>2</span>Search
              </li>
              <li>
                <span>3</span>Edit
              </li>
              <li>
                <span>4</span>Compile
              </li>
              <li>
                <span>5</span>Test
              </li>
            </ol>
          </div>
        </section>

        {/* Chapter II: stops 4-6 share one pinned report; each scroll advances a stage. */}
        <section className="chapter" id="chB" data-from="4" data-to="6" style={{ "--n": 3 }}>
          <div className="pin">
            <div className="copy board report">
              <div className="bhd">
                <span className="lab">
                  <em>II</em> · Verification
                </span>
                <div className="tabs lab" role="list">
                  <span role="listitem" data-k="0">
                    Simulator
                  </span>
                  <span role="listitem" data-k="1">
                    Reward
                  </span>
                  <span role="listitem" data-k="2">
                    Proof
                  </span>
                  <i className="ink"></i>
                </div>
                <span className="lab ctr">
                  <b className="cur">04</b> / 06
                </span>
              </div>
              <div className="cols">
                <div className="panes">
                  <div className="pane" data-k="0">
                    <span className="ghost" aria-hidden="true">04</span>
                    <h2>
                      <Words>The simulator grades it.</Words>
                    </h2>
                    <p>Hidden tests. Match the reference, or fail.</p>
                  </div>
                  <div className="pane" data-k="1">
                    <span className="ghost" aria-hidden="true">05</span>
                    <h2>
                      <Words>The verdict becomes reward.</Words>
                    </h2>
                    <p>Pass or fail, straight back to the model.</p>
                  </div>
                  <div className="pane" data-k="2">
                    <span className="ghost" aria-hidden="true">06</span>
                    <h2>
                      <Words>Tools triple the score.</Words>
                    </h2>
                    <p>Hard tasks solved, out of 40.</p>
                  </div>
                </div>
                <div className="panes viz">
                  <div className="pane card sim" data-k="0">
                    <svg
                      viewBox="-44 0 404 60"
                      role="img"
                      aria-label="Golden and agent-fix waveforms locking into alignment"
                    >
                      <text x="-44" y="15" {...LABEL}>
                        CLK
                      </text>
                      <text x="-44" y="49" {...LABEL}>
                        DATA
                      </text>
                      <polyline id="sclk" fill="none" stroke="#7D7266" strokeWidth="1" points=""></polyline>
                      <polyline
                        id="sgold"
                        fill="none"
                        stroke="#C49A55"
                        strokeWidth="4"
                        strokeOpacity=".7"
                        points=""
                      ></polyline>
                      <g id="sfixg">
                        <polyline id="sfix" fill="none" stroke="#F1EADF" strokeWidth="1.2" points=""></polyline>
                      </g>
                    </svg>
                    <div className="ft">
                      <div className="pass" id="pass">
                        PASS
                      </div>
                    </div>
                  </div>
                  <div className="pane flow" data-k="1">
                    <div>
                      <span className="v ok">PASS</span>
                      <i></i>
                      <span className="r">1</span>
                    </div>
                    <div>
                      <span className="v">FAIL</span>
                      <i></i>
                      <span className="r">0</span>
                    </div>
                  </div>
                  <div className="pane bench" data-k="2">
                    <div>
                      <span className="lab">One-shot</span>
                      <b style={{ "--w": 9 / 40 }}></b>
                      <span className="n">9</span>
                    </div>
                    <div className="hi">
                      <span className="lab">Agent</span>
                      <b style={{ "--w": 30 / 40 }}></b>
                      <span className="n">30</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="beat" data-i="7" data-pos="R">
          <div className="copy">
            <span className="lab">
              <em>07</em> · Scale
            </span>
            <span className="count" id="count">
              0
            </span>
            <h2>Every die is a task. Every task is verified.</h2>
          </div>
        </section>

        <section className="beat" data-i="8" id="book">
          <div className="copy">
            <h2>
              Train your models on hardware that fights back<span className="dot">.</span>
            </h2>
            <p>
              Envira builds simulator-checked RL environments for chip design, ready for your
              training stack.
            </p>
            <DemoForm />
          </div>
        </section>
      </main>

      <footer>
        <div className="top">
          <span className="lab">Envira · RL environments for hardware</span>
          <span>[your email]</span>
        </div>
        <div className="split">
          <div className="word" aria-hidden="true">
            Envira
          </div>
          <div className="team">
            <div className="blob">
            <p>
              Built by a team from Northwestern and Berkeley, having worked in frontier ML labs and
              data companies.
            </p>
            <div className="logos">
              <img className="nu" src={`${BASE}/logos/northwestern.svg`} alt="Northwestern University" />
              <img className="cal" src={`${BASE}/logos/berkeley.svg`} alt="UC Berkeley" />
            </div>
            </div>
          </div>
        </div>
      </footer>

      <Scene />
    </>
  );
}
