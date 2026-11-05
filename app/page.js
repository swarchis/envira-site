import Scene from "@/components/Scene";

// Booking link used by the header button and both demo forms.
// Replace with your Cal.com / Calendly link; the email field is passed through as a prefill.
const BOOKING_URL = "https://cal.com";

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

        <section className="beat" data-i="1" data-pos="L">
          <div className="copy">
            <span className="lab">
              <em>01</em> · Seed designs
            </span>
            <h2>It starts with real hardware.</h2>
            <p>
              We begin from real, permissively licensed Verilog designs. FIFOs, UARTs, timers,
              interrupt controllers. Working RTL with real corner cases.
            </p>
          </div>
        </section>

        <section className="beat" data-i="2" data-pos="R">
          <div className="copy">
            <span className="lab">
              <em>02</em> · Bug injector
            </span>
            <h2>One subtle bug.</h2>
            <p>
              Each task gets a realistic fault, the kind an engineer actually makes. Every bug is
              confirmed to be caught by tests before it ships as a task.
            </p>
            <div className="card">
              <div className="hd lab">
                <span>Mutation · fifo.v</span>
                <span>Off by one</span>
              </div>
              <div className="diff">
                <span className="m">−</span>
                <span className="m">assign full = (count == DEPTH);</span>
                <span className="r">+</span>
                <span>
                  assign full = (count == DEPTH <u>- 1</u>);
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

        <section className="beat" data-i="4" data-pos="RT">
          <div className="copy">
            <span className="lab">
              <em>04</em> · Simulator
            </span>
            <h2>The simulator grades it.</h2>
            <p>
              Every fix runs against hidden tests in simulation. The waveforms match the reference
              or the fix fails, so it can&apos;t be faked.
            </p>
            <div className="card sim">
              <div className="hd lab">
                <span>Waveform compare</span>
                <span>Hidden tests</span>
              </div>
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
                <div className="key lab">
                  <span>
                    <b style={{ height: 4, background: "#C49A55" }}></b>Golden
                  </span>
                  <span>
                    <b style={{ height: 1, background: "#F1EADF" }}></b>Agent fix
                  </span>
                </div>
                <div className="pass" id="pass">
                  PASS
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="beat" data-i="5" data-pos="LT">
          <div className="copy">
            <span className="lab">
              <em>05</em> · Reward
            </span>
            <h2>The verdict becomes reward.</h2>
            <p>
              Pass or fail flows back to the model as a clean reward signal. Thousands of times
              over. That is the training loop.
            </p>
          </div>
        </section>

        <section className="beat" data-i="6" data-pos="BOT">
          <div className="copy wide">
            <span className="lab">
              <em>06</em> · Proof
            </span>
            <div className="stats">
              <div className="stat">
                <span className="n">1,009</span>
                <span className="lab">Bug-fix tasks across 12 seed designs</span>
              </div>
              <div className="stat">
                <span className="n">0 / 0</span>
                <span className="lab">False rejects / misses. Grader validated on 637 mutants</span>
              </div>
              <div className="stat">
                <span className="n">
                  9 <i>→</i> 30
                </span>
                <span className="lab">Hard tasks solved, of 40. One-shot vs. agent mode with tools</span>
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
        <div className="word" aria-hidden="true">
          Envira
        </div>
      </footer>

      <Scene />
    </>
  );
}
