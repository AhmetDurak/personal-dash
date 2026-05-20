import { useState } from 'react'

// ── Data types ─────────────────────────────────────────────────────────────────

interface Rule {
  n: number
  icon: string
  title: string
  body: string
  cls: string
}

interface Topic {
  id: string
  title: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  readMin: number
  paras: string[]
  keyPoints: string[]
  formula?: { label: string; expr: string; example: string }
  tip?: string
}

interface Category {
  id: string
  label: string
  emoji: string
  topics: Topic[]
}

// ── Golden Rules ───────────────────────────────────────────────────────────────

const RULES: Rule[] = [
  {
    n: 1, icon: '💰',
    title: 'Pay Yourself First',
    body: 'Before paying any bill, automatically transfer a fixed amount to savings or investment. Treat it as a non-negotiable expense — not whatever is left at month-end.',
    cls: 'border-emerald-200 bg-emerald-50',
  },
  {
    n: 2, icon: '🛡️',
    title: 'Emergency Fund Before Investing',
    body: 'Build 3–6 months of living expenses in cash before investing a single euro. Without a buffer, any crisis forces you to sell investments at the worst possible time.',
    cls: 'border-blue-200 bg-blue-50',
  },
  {
    n: 3, icon: '⏳',
    title: 'Time Is Your Greatest Weapon',
    body: '€1,000 at 7% p.a. → €7,612 after 30 years → €14,974 after 40 years. Every year you delay costs more than any clever stock pick can recover.',
    cls: 'border-violet-200 bg-violet-50',
  },
  {
    n: 4, icon: '🌍',
    title: 'Diversify Ruthlessly',
    body: 'A single global ETF holds 1,400+ companies in 23 countries. Concentrating in a few stocks is uncompensated risk — the market does not reward you for it.',
    cls: 'border-amber-200 bg-amber-50',
  },
  {
    n: 5, icon: '📉',
    title: 'Keep Costs Brutally Low',
    body: '€100k with 1% extra annual cost loses ~€75k over 30 years. Every basis point of TER compounds against you. Target TER < 0.25% p.a., always.',
    cls: 'border-red-200 bg-red-50',
  },
  {
    n: 6, icon: '📈',
    title: 'Time In Market Beats Timing',
    body: 'Missing just the 10 best trading days in a decade roughly halves your return. Nobody calls tops and bottoms consistently. Stay invested. Always.',
    cls: 'border-cyan-200 bg-cyan-50',
  },
  {
    n: 7, icon: '🧠',
    title: 'Emotions Are Your Worst Advisor',
    body: 'Buying in euphoria and panic-selling in crashes is how wealth is destroyed. Automate contributions, write a plan, and stop checking prices daily.',
    cls: 'border-orange-200 bg-orange-50',
  },
  {
    n: 8, icon: '⚖️',
    title: 'The 50/30/20 Rule',
    body: 'Needs 50% · Wants 30% · Savings & Investment 20%. Applied consistently for a decade, this simple split outperforms most sophisticated strategies.',
    cls: 'border-teal-200 bg-teal-50',
  },
  {
    n: 9, icon: '🔄',
    title: 'Invest Regularly (DCA / Sparplan)',
    body: 'A monthly Sparplan removes the fear of "wrong timing." When prices fall, your fixed amount buys more shares automatically — volatility becomes an advantage.',
    cls: 'border-indigo-200 bg-indigo-50',
  },
  {
    n: 10, icon: '⚠️',
    title: 'Never Invest Money You Need Soon',
    body: 'Markets can drop 50%+ and take years to recover. Money needed within 3 years belongs in a savings account — not in stocks or ETFs.',
    cls: 'border-pink-200 bg-pink-50',
  },
]

// ── Topics ─────────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: 'basics', label: 'Basics', emoji: '📚',
    topics: [
      {
        id: 'income-expenses', title: 'Income & Expenses',
        level: 'Beginner', readMin: 3,
        paras: [
          'Income is any money flowing into your household — salary, freelance work, dividends, rental income. Expenses are everything flowing out — rent, food, subscriptions, insurance.',
          'The gap between the two is your monthly surplus (or deficit). A positive surplus is the raw material for every financial goal: emergency fund, investing, buying a home. Most people have a surprisingly poor picture of their actual expenses.',
          'Tracking for just 2–3 months usually reveals spending patterns that were completely invisible before — subscriptions forgotten years ago, dining-out costs 3× the mental estimate, impulse purchases that add up.',
        ],
        keyPoints: [
          'Net Income = Gross Income − Income Tax − Social Contributions',
          'Monthly Surplus = Net Income − Total Expenses',
          'Fixed expenses (rent, insurance) vs. variable (food, leisure) — you can only cut variable ones quickly',
          'Track every expense for 90 days before making any big financial decisions',
          'Automate savings the day your salary arrives — never rely on willpower at month-end',
        ],
        tip: 'A finance dashboard connected to your bank account (like this one) is the fastest way to get an honest picture of your cash flow without manual tracking.',
      },
      {
        id: 'net-worth', title: 'Net Worth',
        level: 'Beginner', readMin: 3,
        paras: [
          'Net Worth is the single number that summarizes your entire financial position: everything you own minus everything you owe. It is a snapshot, not a score — but tracking it monthly reveals whether you are moving forward or backward.',
          'Assets include: cash, savings accounts, investment accounts (ETFs, stocks), retirement funds, real estate market value, vehicles. Liabilities include: mortgage balance, student loans, car loans, credit card debt.',
          'A negative net worth is normal at 25 with student loans. A negative net worth at 45 is a red flag. The direction of change month-over-month matters more than any single number.',
        ],
        keyPoints: [
          'Net Worth = Total Assets − Total Liabilities',
          'Liquid assets (cash, ETFs) are more valuable than illiquid assets (real estate) — accessible quickly in emergencies',
          'Track net worth on the 1st of each month — the trend is more important than any single snapshot',
          'A car depreciates every year (liability disguised as asset). An ETF portfolio should appreciate (true asset)',
          'Paying down high-interest debt is mathematically equivalent to earning a guaranteed return at that rate',
        ],
        tip: 'Update your net worth calculation monthly on a fixed date. After 12 months you will have an honest picture of your financial trajectory.',
      },
      {
        id: 'inflation', title: 'Inflation',
        level: 'Beginner', readMin: 4,
        paras: [
          'Inflation is the gradual increase in prices over time. At the ECB\'s 2% target, something that costs €100 today costs €122 in 10 years and €149 in 20 years. Your cash purchasing power erodes silently every year you do nothing.',
          'Cash in a 0% savings account is losing purchasing power every year. This is why investing is not optional for long-term wealth preservation — it is mandatory. Inaction has a cost most people never see.',
          'The "real return" of any investment subtracts inflation from the nominal return. If your ETF returns 7% and inflation is 2%, your real return is roughly 5% — your actual gain in purchasing power per year.',
        ],
        keyPoints: [
          'Real Return ≈ Nominal Return − Inflation Rate (simplified)',
          'At 2% inflation, purchasing power halves every ~36 years',
          'Equities historically beat inflation over long periods; bonds and cash often do not',
          'Rent, healthcare, and education often inflate faster than the headline CPI rate',
          'The ECB targets ~2% annual inflation — sustained deflation is also economically harmful',
        ],
        formula: {
          label: 'Fisher Equation (exact real return)',
          expr: 'Real Return = (1 + Nominal) ÷ (1 + Inflation) − 1',
          example: '7% nominal, 2% inflation → (1.07 ÷ 1.02) − 1 = 4.9% real return per year',
        },
        tip: 'When evaluating any savings product, always compare its rate to current inflation, not to zero. A 2% savings account with 3% inflation is losing money in real terms.',
      },
      {
        id: 'budget', title: 'The 50/30/20 Budget Rule',
        level: 'Beginner', readMin: 3,
        paras: [
          'The 50/30/20 rule divides your net income into three buckets. It is intentionally simple — complex budgets fail because they require constant maintenance. Simple rules applied consistently beat complicated rules abandoned in week two.',
          '50% for Needs: rent, groceries, utilities, insurance, minimum debt payments. These are non-negotiable. 30% for Wants: dining out, hobbies, travel, subscriptions, new clothes — enjoyable but optional. 20% for Savings & Investment: emergency fund first, then ETF contributions, then extra debt repayment.',
          'If your rent alone takes 50% of net income, the needs bucket is already full with nothing left for other necessities. This is a signal to increase income or relocate — not to skip the 20% savings.',
        ],
        keyPoints: [
          '50% → Needs (housing, food, transport, insurance, minimum debt payments)',
          '30% → Wants (entertainment, dining out, hobbies, subscriptions)',
          '20% → Savings & Investment (emergency fund → ETFs → extra debt paydown)',
          'Adjust the ratios to your situation — 60/20/20 is fine if you live in an expensive city',
          'The 20% savings must be automated and transferred before spending starts, not after',
        ],
        tip: 'Track your current split first — most people discover they are spending 40–50% on wants before making any changes. The numbers don\'t lie.',
      },
    ],
  },
  {
    id: 'saving', label: 'Saving', emoji: '🏦',
    topics: [
      {
        id: 'emergency-fund', title: 'Emergency Fund',
        level: 'Beginner', readMin: 3,
        paras: [
          'An emergency fund is 3–6 months of total living expenses held in instantly accessible cash. It is not an investment — it is insurance against life. Job loss, medical emergencies, car breakdowns, urgent repairs: any of these can arrive at any time.',
          'Without an emergency fund, any unexpected expense forces you into high-interest debt or forces you to sell investments at whatever the current market price is — which is often during a downturn, exactly when selling is most harmful.',
          '3 months is the minimum. 6 months is better if your income is variable or your job sector is volatile. Freelancers and self-employed people often keep 12 months.',
        ],
        keyPoints: [
          'Keep it in a high-yield Tagesgeld account — liquid and separate from your main spending account',
          'Do not invest the emergency fund in ETFs — it must be accessible without market-timing risk',
          'Build the emergency fund completely before investing, even in tax-advantaged accounts',
          'Replenish immediately after using it — treat the target as a constant minimum, not a one-time goal',
          'A separate account reduces temptation — "out of sight, out of mind" works in your favor here',
        ],
        tip: 'Name your savings account something like "Emergency — Do Not Touch." Childish? Yes. Effective? Absolutely — the small friction helps during moments of temptation.',
      },
      {
        id: 'compound-interest', title: 'Compound Interest',
        level: 'Beginner', readMin: 5,
        paras: [
          'Compound interest means earning returns not just on your original investment, but also on all accumulated previous returns. The result is exponential growth — slow at first, then dramatically accelerating.',
          'Year 1: you invest €1,000 and earn 7% = €70. Year 2: you earn 7% on €1,070 = €74.90. The extra €4.90 seems trivial. After 30 years, those compounding "extras" turn €1,000 into €7,612 — without adding a single additional euro. After 40 years: €14,974.',
          'The most critical insight: time matters more than the amount. €200/month starting at age 25 consistently outperforms €400/month starting at age 35. Starting later costs more than any amount of clever investing can recover.',
        ],
        keyPoints: [
          'Reinvest all dividends — this is what activates compounding for ETFs',
          'Accumulating ETFs (thesaurierend) reinvest dividends automatically; distributing (ausschüttend) pay them out',
          'Rule of 72: divide 72 by your annual return to estimate years to double (72 ÷ 7% ≈ 10 years)',
          'TER differences compound dramatically — 0.10% vs 0.50% TER over 30 years is tens of thousands of euros',
          'Compound interest works in reverse too — 20% credit card interest doubles debt in ~3.6 years',
        ],
        formula: {
          label: 'Future Value (Compound Interest)',
          expr: 'FV = PV × (1 + r)ⁿ',
          example: '€1,000 at 7% for 30 years = 1,000 × 1.07³⁰ = €7,612',
        },
        tip: 'Use the Sparplan calculator in the ETF Monitor tab to visualize compounding for any ETF on your watchlist.',
      },
      {
        id: 'savings-rate', title: 'Savings Rate',
        level: 'Beginner', readMin: 3,
        paras: [
          'Your savings rate — the percentage of net income you save or invest — is arguably the single most powerful variable in achieving financial independence. It determines both how quickly you accumulate wealth and how long your wealth needs to last.',
          'At a 10% savings rate with normal returns, financial independence takes 40+ years. At 30%, roughly 28 years. At 50%, roughly 17 years. Every 1% increase in savings rate shaves months off your working life.',
          'The key insight: every salary increase is a fork in the road. You can expand your lifestyle (lifestyle inflation) or raise your savings rate. Most people choose lifestyle inflation by default — the financially successful ones consciously choose otherwise.',
        ],
        keyPoints: [
          'Savings Rate = (Saved + Invested) ÷ Net Income × 100%',
          'Target at least 20% — 30%+ meaningfully accelerates financial independence',
          'Every raise: split between lifestyle improvement and savings rate increase',
          'Lifestyle inflation is the silent enemy — income rises, savings rate stays flat, nothing changes',
          'Automate savings rate increases on every salary review date before habits form',
        ],
        formula: {
          label: 'Savings Rate',
          expr: 'Savings Rate = Amount Saved ÷ Net Monthly Income × 100%',
          example: '€700 saved on €3,500 net income = 20% savings rate',
        },
      },
    ],
  },
  {
    id: 'investing', label: 'Investing', emoji: '📊',
    topics: [
      {
        id: 'what-is-etf', title: 'What Is an ETF?',
        level: 'Beginner', readMin: 5,
        paras: [
          'An ETF (Exchange-Traded Fund) is a basket of securities — typically stocks or bonds — that trades on a stock exchange like a single stock. When you buy one share of a MSCI World ETF, you instantly own tiny stakes in over 1,400 companies across 23 countries.',
          'ETFs track an index — a predefined list of securities with set rules for inclusion. The fund manager does not decide which stocks to buy; the index rules do. This passive approach means very low management costs and no manager skill risk.',
          'Two main types you will encounter: Accumulating (thesaurierend) ETFs reinvest dividends back into the fund — ideal for compounding. Distributing (ausschüttend) ETFs pay dividends into your account — useful if you want regular income in retirement.',
        ],
        keyPoints: [
          'Passive index ETF = no active stock picking = low TER (typically 0.07–0.25% p.a.)',
          'MSCI World ETF ≈ 1,400 companies: ~65% USA, ~6% Japan, ~4% UK, rest spread globally',
          'MSCI ACWI / FTSE All-World includes Emerging Markets (~10%) for broader diversification',
          'ETFs are regulated as Sondervermögen — if the fund company goes bankrupt, your assets are legally protected',
          'Buy any amount on any trading day at market price; minimum investment = price of one share',
        ],
        tip: 'For a beginner, a single accumulating MSCI World or FTSE All-World ETF is a completely valid and often optimal investment portfolio. Complexity is not a virtue in long-term investing.',
      },
      {
        id: 'stocks-bonds', title: 'Stocks, Bonds & ETFs',
        level: 'Beginner', readMin: 4,
        paras: [
          'A stock (Aktie) represents ownership in a company. When the company grows and profits, your shares appreciate and may pay dividends. If it fails, your shares can go to zero. High potential return, high risk — especially in single companies.',
          'A bond (Anleihe) is a loan you make to a government or corporation. They pay a fixed interest rate (coupon) and return your principal at maturity. Historically lower returns than stocks, but much lower volatility — bond prices do not crash 50% in a crisis.',
          'An ETF is a wrapper, not an asset class. It can hold stocks (equity ETF), bonds (bond ETF), commodities, or any combination. For long horizons (10+ years), equity ETFs have delivered the best real returns. Near a financial goal, adding bond ETFs reduces timing risk.',
        ],
        keyPoints: [
          'Stocks: ~7–10% historical annual return, can drop 50%+ in a bear market',
          'Government bonds: ~2–4% historical return, much lower volatility, nearly zero default risk',
          'Corporate bonds: slightly higher yield than government bonds, slightly more risk',
          'For a 10+ year horizon, most advisors suggest heavy equity allocation (80–100%)',
          'As you approach retirement or a goal date, gradually shift toward bonds to reduce risk',
        ],
        tip: 'Ignore cryptocurrency when thinking about asset classes. It has no earnings, pays no interest, produces nothing. It is speculation — not investment in the financial planning sense.',
      },
      {
        id: 'dca', title: 'Dollar-Cost Averaging (Sparplan)',
        level: 'Beginner', readMin: 4,
        paras: [
          'Dollar-Cost Averaging means investing a fixed amount at regular intervals regardless of price. You automatically buy more shares when prices are low and fewer when prices are high — without any decision required from you.',
          'A monthly Sparplan of €300 into an ETF does this automatically. When the ETF falls 20%, your €300 buys 25% more shares than the previous month. When it rises, you buy fewer. Over time, your average purchase price is lower than the average market price during your investment period.',
          'Research shows lump-sum investing beats DCA about two-thirds of the time (markets trend upward). But DCA is behaviorally superior — you are far less likely to panic-sell a plan you committed to before any volatility occurred.',
        ],
        keyPoints: [
          'Set up a broker Sparplan — fully automated, removes the "is now a good time?" paralysis',
          'DCA eliminates the fear of investing at the wrong moment by spreading purchases over time',
          'During bear markets, your monthly Sparplan buys cheap shares — lower average cost',
          'Do not pause your Sparplan in a downturn — that is exactly when buying is most advantageous',
          'German brokers offering free ETF Sparpläne: DKB, ING, Scalable Capital, Trade Republic, Comdirect',
        ],
      },
      {
        id: 'diversification', title: 'Diversification',
        level: 'Intermediate', readMin: 4,
        paras: [
          'Diversification means spreading investments across many different assets so that no single company failure, sector crash, or country crisis can destroy your portfolio. It is the core principle of modern portfolio theory.',
          'If you own only Volkswagen stock and VW has an emissions scandal, you lose 40% overnight. If you own a DAX ETF, VW is ~3% of your portfolio — the loss is ~1.2%. If you own an MSCI World ETF, VW is ~0.3% — the impact is barely measurable.',
          'Diversification is the only true "free lunch" in investing: you reduce risk without necessarily reducing expected return, because different assets do not all crash simultaneously for the same reasons.',
        ],
        keyPoints: [
          'Geographic diversification: not just Germany, not just Europe — global exposure matters',
          'Sector diversification: technology, healthcare, financials, consumer goods — a global ETF provides this automatically',
          'Owning 5 different ETFs all tracking MSCI World variants is NOT diversification — it is concentrated overlap',
          'Correlation matters: assets that move together offer no diversification benefit',
          'Single-stock risk is called "unsystematic risk" — it can be diversified away for free; there is no reason to carry it',
        ],
      },
      {
        id: 'asset-allocation', title: 'Asset Allocation',
        level: 'Intermediate', readMin: 4,
        paras: [
          'Asset allocation is how you divide your portfolio between asset classes — primarily equities and bonds. It is the most important investment decision you will make, explaining ~90% of long-term portfolio return variation across investors.',
          'Classic rule of thumb: (110 − your age) = your equity percentage. At 30: 80% equity / 20% bonds. At 60: 50/50. This is overly simplified but captures the core insight — reduce risk exposure as you approach needing the money.',
          'For a 25–35 year old with 30+ years of runway and stable income, many experts advocate 100% global equity ETF. Bonds provide stability but drag long-term returns. In early accumulation, this tradeoff often does not make sense.',
        ],
        keyPoints: [
          '100% equity: maximum growth, maximum volatility — only suitable for 10+ year horizons',
          '80/20 equity/bonds: modestly reduced volatility, slightly lower expected long-term return',
          'Glide path: gradually increase bond allocation as you approach your goal date',
          'Your emergency fund and cash are NOT part of your investment allocation — they sit outside it',
          'Rebalance once or twice per year: if equity grows to 90% in an 80/20 target, sell equity and buy bonds',
        ],
        formula: {
          label: 'Equity Allocation Rule of Thumb',
          expr: 'Equity % = 110 − Your Age',
          example: 'At age 30: 80% equity ETF, 20% bond ETF. At age 50: 60% equity, 40% bonds.',
        },
      },
    ],
  },
  {
    id: 'costs', label: 'Costs & Tax', emoji: '🧾',
    topics: [
      {
        id: 'ter', title: 'Total Expense Ratio (TER)',
        level: 'Beginner', readMin: 4,
        paras: [
          'The TER is the annual cost of running an ETF, expressed as a percentage of assets. A TER of 0.20% means you pay €2 per year per €1,000 invested — deducted automatically from the fund value, never as an explicit invoice.',
          'Passive ETFs tracking major indices have TERs of 0.05–0.25%. Actively managed mutual funds often charge 1.5–2.5%. The annual difference seems small, but compounding makes it devastating over decades.',
          'Example: €10,000 at 7% gross return, 30 years. With 0.20% TER: €72,100. With 1.50% TER: €52,680. The 1.3% annual cost difference means you end up with €19,420 less — more than double the original investment.',
        ],
        keyPoints: [
          'Lower TER = more of the gross index return stays in your pocket, compounding over decades',
          'TER does not include internal transaction costs — Tracking Difference (TD) is more accurate',
          'Some ETFs with higher TER outperform their index due to securities lending income (lower TD)',
          'Benchmark low-cost ETFs: iShares Core MSCI World (0.20%), Xtrackers MSCI World (0.19%), Vanguard FTSE All-World (0.22%)',
          'Never buy a passively managed fund with TER above 0.50% for major index exposure',
        ],
        formula: {
          label: 'Cost Impact Over 30 Years',
          expr: 'Wealth Lost = PV × [(1+r−TER₁)³⁰ − (1+r−TER₂)³⁰]',
          example: '€10k, 7% gross, 30y: TER 0.20% → €72,100 | TER 1.50% → €52,680 | Difference: €19,420',
        },
        tip: 'Check both TER AND Tracking Difference (TD) on justETF.com for any ETF you buy. TD is the actual real-world deviation from the index — often more meaningful than TER.',
      },
      {
        id: 'abgeltungssteuer', title: 'Abgeltungssteuer (Capital Gains Tax)',
        level: 'Intermediate', readMin: 5,
        paras: [
          'Germany taxes capital gains (Kapitalerträge) at a flat 25% plus 5.5% Solidaritätszuschlag, giving an effective rate of ~26.375% (plus church tax if applicable). This applies to dividends and realized gains when you sell.',
          'Every person has a Sparerpauschbetrag of €1,000/year (€2,000 for married couples) exempt from capital gains tax. File a Freistellungsauftrag with your broker — otherwise the broker withholds 26.375% on everything from euro one.',
          'For accumulating ETFs, Germany introduced a Vorabpauschale (advance lump-sum tax) from 2018. Even without selling or receiving dividends, you may owe a small annual tax based on a theoretical return. In low-interest-rate years this is minimal; it increases with rising base rates.',
        ],
        keyPoints: [
          'File a Freistellungsauftrag for up to €1,000 with your broker — this is completely free money',
          '25% + Soli = ~26.375% effective rate on all capital gains (+ church tax if applicable)',
          'Unrealised gains are not taxed — you only owe when you sell (tax deferral is a massive compounding advantage)',
          'Vorabpauschale: Base Rate × 0.7 × ETF value at year start — calculated and charged automatically by your broker',
          'Accumulating ETFs are not inherently better than distributing on a tax basis in Germany — the Vorabpauschale equalizes them',
        ],
        tip: 'Set your Freistellungsauftrag on January 1st each year. If you have multiple brokers, split the €1,000 allowance across them. Check the German tax form (Anlage KAP) if you have foreign brokers.',
      },
    ],
  },
  {
    id: 'psychology', label: 'Psychology', emoji: '🧠',
    topics: [
      {
        id: 'biases', title: 'Behavioral Biases',
        level: 'Intermediate', readMin: 6,
        paras: [
          'Behavioral finance studies why humans make systematically irrational financial decisions. The brain evolved to survive the savanna — it is poorly wired for navigating financial markets. Understanding these biases is step one to not being victimized by them.',
          'Loss Aversion: losses feel roughly 2× as painful as equivalent gains feel good. This causes investors to hold losing positions too long ("it will come back") and sell winners too quickly ("lock in profit while I can"). Net result: wrong decisions at both ends, consistently.',
          'Recency Bias: we dramatically overweight recent events in predictions. After years of bull market, investors pour in money expecting it to continue. After a crash, they hold cash expecting further drops. This is the primary mechanism behind "buy high, sell low."',
        ],
        keyPoints: [
          'Loss Aversion: pain of −€100 ≈ 2× the joy of +€100. Causes holding losers and selling winners prematurely',
          'Recency Bias: projecting recent trends into the future — markets are not trend-following systems',
          'Overconfidence: most investors believe they are above-average pickers. In aggregate, this is mathematically impossible',
          'Herd Behaviour: buying because "everyone is doing it" (dotcom 2000, crypto 2021) — assets become overvalued at peak enthusiasm',
          'Anchoring: fixating on a past price ("I paid €200, I\'ll sell when it returns") — irrelevant to future fundamental value',
          'Sunk Cost Fallacy: holding a bad investment because you "don\'t want to realize the loss" — the past cost is gone regardless',
        ],
        tip: 'The antidote: an automated Sparplan with a written Investment Policy Statement you commit to before markets move. Write your plan when calm; execute it when emotional.',
      },
      {
        id: 'mistakes', title: 'Common Mistakes to Avoid',
        level: 'Beginner', readMin: 5,
        paras: [
          'Most investment mistakes are not about picking the wrong stock — they are behavioral and structural. Recognizing them before making them is far more valuable than learning from experience.',
          '"Waiting for the right time to invest" is one of the most expensive decisions you will never consciously make. Studies show that immediate investment beats waiting for a dip in the majority of historical periods. Every month waiting is a month of compounding forfeited.',
          'Over-diversifying with too many ETFs is the opposite mistake. Five ETFs all tracking MSCI World variants are not diversification — they are expensive overlap. One global ETF is often more diversified and simpler than a portfolio of 10 similarly constructed funds with different names.',
        ],
        keyPoints: [
          'No emergency fund before investing → forced to sell at market lows during a personal crisis',
          '"Waiting for a dip" → statistically, you will wait while the market rises and invest at a higher price',
          'Panic selling in downturns → locks in losses, misses recovery, loses twice',
          'Ignoring costs → 1% extra TER destroys roughly 30% of terminal wealth over 30 years',
          'Checking portfolio daily → dramatically increases emotional decision frequency and stress',
          'Chasing past performance → last year\'s top-performing ETF is rarely next year\'s leader',
          'Lifestyle inflation on every raise → income doubles, savings rate stays at 5% forever',
        ],
      },
      {
        id: 'market-cycles', title: 'Market Cycles & Bear Markets',
        level: 'Intermediate', readMin: 5,
        paras: [
          'Markets are cyclical. Bull markets are followed by bear markets (−20%+) which are followed by bull markets. This pattern has held for 200+ years. The question is never whether a crash will happen — it will — but whether you can stay invested through it.',
          'Bear markets are financially advantageous for long-term investors still accumulating: your monthly Sparplan buys shares at lower prices. The investors who suffer permanent losses are those who panic-sell during the decline and miss the recovery.',
          'Historical perspective: 2000 dotcom crash (−49%, recovered in 7 years), 2008 financial crisis (−56%, recovered in 5 years), 2020 COVID crash (−34%, recovered in 6 months). Crises feel permanent while happening. Recoveries happen faster than headlines suggest.',
        ],
        keyPoints: [
          'A 50% crash requires a 100% gain to return to breakeven — staying invested through it matters enormously',
          'The stock market has not permanently lost value over any 15-year period in modern history',
          'Volatility is the price paid for higher returns — without it, equities would yield bond-like returns',
          'Rebalancing during crashes (buying equities that fell) systematically buys low — disciplined contrarianism',
          'Bear markets are when long-term wealth is won or lost: winners stay in and buy; losers sell into fear',
        ],
        tip: 'Before the next crash, write your plan: "I will not sell my ETFs even if they drop 40%. I will continue my monthly Sparplan." Sign it. Read it when fear peaks.',
      },
    ],
  },
]

// ── UI helpers ─────────────────────────────────────────────────────────────────

const LEVEL_CLS: Record<string, string> = {
  Beginner:     'bg-emerald-100 text-emerald-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced:     'bg-red-100 text-red-700',
}

// ── Views ──────────────────────────────────────────────────────────────────────

function GoldenRulesView() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">The 10 Golden Rules of Personal Finance</h1>
        <p className="text-gray-500 leading-relaxed">
          These principles have guided successful investors for generations. They are not strategies or tips — they are the foundation. Internalize these before anything else.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RULES.map(r => (
          <div key={r.n} className={`rounded-xl border p-5 ${r.cls}`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 text-center w-10">
                <div className="text-2xl mb-1">{r.icon}</div>
                <div className="text-[11px] font-bold text-gray-400 leading-none">#{r.n}</div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5">{r.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{r.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopicView({ topic }: { topic: Topic }) {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${LEVEL_CLS[topic.level]}`}>
            {topic.level}
          </span>
          <span className="text-xs text-gray-400">{topic.readMin} min read</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{topic.title}</h1>
      </div>

      <div className="space-y-4 mb-8">
        {topic.paras.map((p, i) => (
          <p key={i} className="text-gray-700 leading-relaxed">{p}</p>
        ))}
      </div>

      {topic.formula && (
        <div className="bg-gray-900 text-gray-100 rounded-xl p-5 mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-semibold">{topic.formula.label}</p>
          <p className="font-mono text-sm text-emerald-400 mb-2">{topic.formula.expr}</p>
          <p className="text-xs text-gray-300">{topic.formula.example}</p>
        </div>
      )}

      <div className="bg-white border border-xero-border rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Key Points</h3>
        <ul className="space-y-2.5">
          {topic.keyPoints.map((pt, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="text-xero-green font-bold mt-0.5 flex-shrink-0">✓</span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      </div>

      {topic.tip && (
        <div className="bg-xero-green/5 border border-xero-green/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">💡</span>
            <p className="text-sm text-gray-700 leading-relaxed">{topic.tip}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

type Selection = { type: 'rules' } | { type: 'topic'; catId: string; topicId: string }

export function LearnTab() {
  const [selection, setSelection] = useState<Selection>({ type: 'rules' })
  const [open, setOpen] = useState<Set<string>>(new Set(['basics']))

  function toggleCat(id: string) {
    setOpen(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const activeTopic =
    selection.type === 'topic'
      ? CATEGORIES.find(c => c.id === selection.catId)?.topics.find(t => t.id === selection.topicId) ?? null
      : null

  const [mobileShowContent, setMobileShowContent] = useState(false)

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar */}
      <div className={`${mobileShowContent ? 'hidden md:flex' : 'flex'} w-full md:w-60 flex-shrink-0 border-r border-xero-border bg-white flex-col overflow-y-auto`}>
        {/* Golden Rules entry */}
        <button
          onClick={() => { setSelection({ type: 'rules' }); setMobileShowContent(true) }}
          className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold border-b border-gray-100 w-full text-left transition-colors ${
            selection.type === 'rules'
              ? 'bg-amber-50 text-amber-700 border-l-2 border-l-amber-400'
              : 'text-gray-700 hover:bg-gray-50 border-l-2 border-l-transparent'
          }`}
        >
          <span>📜</span>
          <span className="flex-1">Golden Rules</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${selection.type === 'rules' ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>10</span>
        </button>

        {/* Categories */}
        {CATEGORIES.map(cat => {
          const isOpen = open.has(cat.id)
          return (
            <div key={cat.id} className="border-b border-gray-100">
              <button
                onClick={() => toggleCat(cat.id)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide w-full text-left hover:bg-gray-50 transition-colors"
              >
                <span>{cat.emoji}</span>
                <span className="flex-1">{cat.label}</span>
                <span className={`text-gray-400 text-base transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>›</span>
              </button>
              {isOpen && (
                <div className="pb-1">
                  {cat.topics.map(t => {
                    const isActive = selection.type === 'topic' && selection.topicId === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setSelection({ type: 'topic', catId: cat.id, topicId: t.id }); setMobileShowContent(true) }}
                        className={`w-full text-left px-6 py-2 text-sm transition-colors ${
                          isActive
                            ? 'text-xero-green font-semibold bg-xero-green/5 border-l-2 border-xero-green'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-l-2 border-transparent'
                        }`}
                      >
                        {t.title}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <div className="flex-1" />
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed">
            {CATEGORIES.reduce((s, c) => s + c.topics.length, 0)} topics · {RULES.length} golden rules
          </p>
        </div>
      </div>

      {/* Content */}
      <div className={`${!mobileShowContent ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-y-auto bg-xero-bg`}>
        <button
          onClick={() => setMobileShowContent(false)}
          className="md:hidden flex items-center gap-2 px-4 py-3 text-sm text-gray-500 border-b border-gray-100 bg-white hover:bg-gray-50"
        >
          <span>←</span> Back
        </button>
        {selection.type === 'rules' && <GoldenRulesView />}
        {activeTopic && <TopicView topic={activeTopic} />}
      </div>
    </div>
  )
}
