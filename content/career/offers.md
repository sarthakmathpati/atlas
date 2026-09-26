---
topic: career.offers
name: "Offers"
subject: career
order: 4
prereqs: []
---

## career.offers.understanding-compensation
name: "Understanding compensation"
importance: important
needsReview: true
scope: "base, bonus, stock, CTC breakdown, in-hand pay"

### simple
The CTC on an offer letter is everything the company expects to spend on you in a year, not the money that reaches your bank account. It adds fixed pay, a bonus you may or may not get in full, one-time payments, stock that arrives over years, and savings the employer pays in for you. It is like the price on a holiday package: flights, hotel and taxes are all in the headline, but only part of it is spending money.

### interview
- **CTC** (cost to company) = fixed pay + target bonus + one-time joining bonus + stock (usually a year's share of the grant) + employer retirement contributions (provident fund, gratuity) + insurance and other benefits.
- **Fixed pay** is split into basic pay and allowances; basic pay drives the provident fund and gratuity.
- **In-hand pay** each month = fixed pay / 12 minus your provident fund contribution, professional tax and income tax deducted at source.
- **Bonus** is a target, not a promise: payout depends on company and personal performance, and the first year may be pro-rated.
- **Stock**: shares vest over years, often with a one-year cliff; their value moves with the share price, and startup stock options may be hard to sell.
- Compare offers on first-year cash, steady yearly cash and the total over four years, and read the joining bonus's repayment terms.

### deep
#### The pieces of a CTC

| Component | Cash in hand? | When |
|---|---|---|
| Fixed pay (basic pay plus allowances) | yes, after deductions | monthly |
| Performance bonus | yes, if paid | usually once a year, after reviews |
| Joining bonus | yes, once | often split into parts; repayable if you leave early |
| Stock (RSUs) | shares, not cash | as they vest, often after a one-year cliff |
| Employer provident fund | no, savings | monthly into your PF account |
| Gratuity | no | only if you stay long enough to qualify |
| Insurance and benefits | no | premiums paid for you |

#### A made-up offer, computed exactly

Kiran's (made-up) offer: fixed pay ₹18,00,000 a year with basic pay at half of it, a 10% target bonus, a ₹1,50,000 joining bonus paid in two halves (months 1 and 7), and stock worth ₹8,00,000 at the grant price vesting over four years (25% at the one-year cliff, then 6.25% a quarter).

Assumptions, stated so you can change them:

- **Tax**: India's new regime as it stood for **FY 2025-26** (assessment year 2026-27): a ₹75,000 standard deduction; slabs of 0% up to ₹4 lakh, then 5%, 10%, 15%, 20% and 25% for each further ₹4 lakh, and 30% above ₹24 lakh; no tax up to ₹12 lakh of income through the section 87A rebate, with marginal relief just above; a 4% health and education cess; income and tax rounded to the nearest ₹10. No surcharge below ₹50 lakh. Tax rules change with every budget, so check the current year's.
- The first 12 months are treated as one financial year (a mid-year joiner really spans two).
- Vested stock is taxed as salary at the grant price; the share price stays flat. Employer provident fund is not taxed.
- The employer spreads the year's tax evenly over 12 salaries; the bonus is paid in full in month 12.
- Professional tax ₹200 a month. It is a state levy, so the amount depends on where you work.

```cpp
// A made-up offer, computed exactly in whole rupees: CTC, cash, stock and monthly in-hand pay.
// Tax assumption: India's new regime as it stood for FY 2025-26 (assessment year 2026-27),
// applied to the first 12 months of the job as if they were one financial year.
using Rs = long long;

string inr(Rs v) {  // Indian digit grouping: 12,34,567
    string s = to_string(llabs(v)), out;
    for (int i = s.size() - 1, k = 0; i >= 0; --i, ++k) {
        if (k == 3 || (k > 3 && k % 2 == 1)) out += ',';
        out += s[i];
    }
    return (v < 0 ? "-" : "") + string(out.rbegin(), out.rend());
}

Rs roundTo10(Rs v) { return (v + 5) / 10 * 10; }

Rs incomeTax(Rs salary) {  // new regime, FY 2025-26; salary before the standard deduction
    Rs income = roundTo10(max<Rs>(0, salary - 75000));  // standard deduction for salaries
    assert(income <= 5000000);  // surcharge starts above 50 lakh; not modelled
    const Rs top[] = {400000, 800000, 1200000, 1600000, 2000000, 2400000, LLONG_MAX};
    Rs tax = 0, lower = 0;
    for (int i = 0; i < 7; ++i) {  // 0%, 5%, 10%, ... 30% slabs
        if (income > lower) tax += (min(income, top[i]) - lower) * 5 * i / 100;
        lower = top[i];
    }
    if (income <= 1200000) tax = 0;  // rebate under section 87A (up to 60,000)
    else tax = min(tax, income - 1200000);  // marginal relief just above 12 lakh
    return roundTo10(tax + tax * 4 / 100);  // 4% health and education cess
}

int main() {
    const Rs fixedPay = 1800000, basic = fixedPay / 2;  // basic pay is half the fixed pay
    const Rs employerPF = basic * 12 / 100, gratuity = basic / 12 * 15 / 26, insurance = 12000;
    const Rs targetBonus = fixedPay / 10, joining = 150000, grant = 800000;
    const Rs employeePF = basic * 12 / 100, profTaxPerMonth = 200;  // a state levy; varies

    Rs ctc = fixedPay + employerPF + gratuity + insurance + targetBonus + joining + grant / 4;
    printf("Offer letter, year 1\n");
    for (auto [what, rs] : vector<pair<const char*, Rs>>{
             {"fixed pay", fixedPay}, {"employer PF (12% of basic)", employerPF},
             {"gratuity (15/26 of a month's basic)", gratuity}, {"health insurance", insurance},
             {"performance bonus (target 10%)", targetBonus}, {"joining bonus", joining},
             {"stock (a quarter of the grant)", grant / 4}, {"CTC", ctc}})
        printf("  %-36s %11s\n", what, inr(rs).c_str());

    // The grant vests 25% at the one-year cliff, then 6.25% every quarter for three years.
    for (int year = 1; year <= 2; ++year) {
        Rs joinThisYear = year == 1 ? joining : 0, stock = grant / 4;
        Rs yearCtc = ctc - joining + joinThisYear;
        Rs salary = fixedPay + targetBonus + joinThisYear + stock;  // vested stock is salary
        Rs tax = incomeTax(salary), cash = 0;
        printf("Year %d: salary income %s, income tax %s\n", year, inr(salary).c_str(),
               inr(tax).c_str());
        for (int m = 1; m <= 12; ++m) {  // tax is spread evenly; the last month takes the rest
            Rs taxThisMonth = m < 12 ? tax / 12 : tax - tax / 12 * 11;
            Rs pay = (fixedPay - employeePF) / 12 - profTaxPerMonth - taxThisMonth;
            if (joinThisYear && (m == 1 || m == 7)) pay += joining / 2;  // paid in two parts
            if (m == 12) pay += targetBonus;  // assumes the full target is paid
            cash += pay;
            if (year == 1 && (m <= 2 || m == 7 || m == 12))
                printf("  month %2d in hand %9s\n", m, inr(pay).c_str());
        }
        printf("  cash in hand %s, %s a month on average, %.1f%% of CTC %s\n", inr(cash).c_str(),
               inr(cash / 12).c_str(), 100.0 * cash / yearCtc, inr(yearCtc).c_str());
        printf("  plus stock worth %s at the grant price and PF savings of %s\n",
               inr(stock).c_str(), inr(employeePF + employerPF).c_str());
    }
    printf("Stock vesting per year for the same grant:\n");
    for (auto [name, pct] : vector<pair<const char*, vector<int>>>{
             {"25% a year", {25, 25, 25, 25}}, {"10/20/30/40", {10, 20, 30, 40}}}) {
        printf("  %-12s", name);
        for (int p : pct) printf(" %9s", inr(grant * p / 100).c_str());
        printf("\n");
    }
    printf("Tax at other salaries (same regime):\n");
    for (Rs s : {775000LL, 1275000LL, 1300000LL, 1350000LL, 2400000LL})
        printf("  salary %11s  tax %9s\n", inr(s).c_str(), inr(incomeTax(s)).c_str());
}
```

Output:

```text
Offer letter, year 1
  fixed pay                              18,00,000
  employer PF (12% of basic)              1,08,000
  gratuity (15/26 of a month's basic)       43,269
  health insurance                          12,000
  performance bonus (target 10%)          1,80,000
  joining bonus                           1,50,000
  stock (a quarter of the grant)          2,00,000
  CTC                                    24,93,269
Year 1: salary income 23,30,000, income tax 2,74,300
  month  1 in hand  1,92,942
  month  2 in hand  1,17,942
  month  7 in hand  1,92,942
  month 12 in hand  2,97,938
  cash in hand 17,45,300, 1,45,441 a month on average, 70.0% of CTC 24,93,269
  plus stock worth 2,00,000 at the grant price and PF savings of 2,16,000
Year 2: salary income 21,80,000, income tax 2,35,300
  cash in hand 16,34,300, 1,36,191 a month on average, 69.7% of CTC 23,43,269
  plus stock worth 2,00,000 at the grant price and PF savings of 2,16,000
Stock vesting per year for the same grant:
  25% a year    2,00,000  2,00,000  2,00,000  2,00,000
  10/20/30/40     80,000  1,60,000  2,40,000  3,20,000
Tax at other salaries (same regime):
  salary    7,75,000  tax         0
  salary   12,75,000  tax         0
  salary   13,00,000  tax    26,000
  salary   13,50,000  tax    74,100
  salary   24,00,000  tax  2,92,500
```

#### Reading the numbers

- **Headline against cash.** A CTC of ₹24,93,269 turns into ₹17,45,300 of cash in the first year, 70.0% of the CTC, plus stock and provident fund savings.
- **A normal month is smaller than the average.** Most months pay ₹1,17,942. The average of ₹1,45,441 includes the joining bonus halves (months 1 and 7 pay ₹1,92,942) and the bonus in month 12 (₹2,97,938). Budget on the normal month.
- **Year two is not year one.** Without the joining bonus, the CTC falls to ₹23,43,269 and cash to ₹16,34,300.
- **The vesting schedule matters.** The CTC counts a quarter of the grant each year. With an even schedule that is what vests; with a 10/20/30/40 schedule, year one brings only ₹80,000 of stock.
- **Tax has a soft cliff at ₹12 lakh.** Salaries of ₹7,75,000 and ₹12,75,000 pay no tax. At ₹13,00,000 marginal relief keeps the tax, with cess, at ₹26,000, and by ₹13,50,000 the normal slabs apply (₹74,100).

#### Stock options at startups

Startups often give ESOPs: options to buy shares at a fixed price after they vest. They are worth something only if the company's value grows and there is a way to sell, such as a buyback, a sale or a listing. Exercising usually triggers tax on the gain at that point, before you can sell. Value them cautiously, and ask about the strike price, vesting, the exercise window after leaving, and past buybacks.

#### Questions to ask about any offer

- Which parts are fixed and which variable? What share of target bonus was actually paid in recent years?
- Joining bonus: when is it paid, and what do you repay if you leave within a year?
- Stock: RSUs or options, the vesting schedule and cliff, refresher grants, and how shares can be sold.
- Notice period, probation, relocation support and the start date.

Connects to: [negotiation basics](#/concept/career.offers.negotiation-basics), [choosing between offers](#/concept/career.offers.choosing-between-offers), [utility and risk aversion](#/concept/markets.betting.utility-and-risk-aversion).

### questions
Q: Why is CTC different from in-hand pay?
A: CTC includes items that never reach your monthly salary: employer provident fund, gratuity, insurance, stock and one-time or conditional payments. In-hand pay is fixed pay minus your provident fund contribution, professional tax and income tax, plus any bonus actually paid.

Q: What is a vesting cliff?
A: A period, often one year, before any stock vests. If you leave before the cliff you get none of the grant; after it, a first block vests and the rest usually vests monthly or quarterly.

Q: Why should a one-time joining bonus be treated carefully when comparing offers?
A: It appears in the first year's CTC but not in later years, and it often has to be repaid if you leave within a set time. Compare steady yearly pay separately from one-time amounts.

Q: What does basic pay affect beyond your salary?
A: Your provident fund contributions and gratuity are computed from basic pay, so a higher basic share raises savings and lowers monthly in-hand pay. Allowances are the rest of the fixed pay.

Q: How should you value startup stock options?
A: Cautiously: they pay only if the company grows and you can sell the shares, and exercising can create a tax bill before any sale. Ask about the strike price, vesting, the exercise window after leaving and any past buybacks.

## career.offers.negotiation-basics
name: "Negotiation basics"
importance: important
prereqs: [career.offers.understanding-compensation]
scope: "competing offers, being polite and specific"

### simple
Negotiating an offer is a polite, specific conversation about whether the company can improve one or two things, not a battle. Recruiters expect it for many roles, and a reasonable request made kindly rarely costs you the offer. It is like asking a shop whether a slightly bigger size is available: ask clearly, give a reason, and be gracious about the answer.

### interview
- First learn the rules: many campus placements fix offers and forbid negotiation, and accepting one offer may end your placement season; off-campus and lateral offers usually have some room.
- Negotiable parts include fixed pay, joining bonus, stock, start date, location and team; not every part can move at every company.
- Be specific: name the item and the amount, give a real reason (a competing offer, the role's scope), and say what would let you accept.
- Use competing offers honestly: never invent or inflate one, and be ready to share details if asked.
- Stay warm: thank them, show you want the role, and accept a final answer gracefully.
- Don't: lie, give ultimatums, negotiate after accepting, or accept and later back out.

### deep
#### When negotiation is possible

On campus, placement cells often set rules: offers are standard, and accepting one may take you out of the process. Read your college's rules before you plan anything. Off campus, and for internships converting to full-time roles at some companies, there is often room, most commonly in the joining bonus, sometimes in fixed pay or stock. Ask once, clearly, near the end of the process, once you have the offer in writing.

#### What an extra rupee is worth

Not all asks of the same size are equal. The program values three asks over four years before tax, assuming an 8% yearly raise, a 10% bonus target on fixed pay and employer provident fund at 6% of fixed pay (12% of a basic that is half of it); all three are made-up assumptions.

```cpp
// Three asks of similar size, valued over four years before tax (made-up assumptions below).
string inr(long long v) {  // Indian digit grouping: 12,34,567
    string s = to_string(v), out;
    for (int i = s.size() - 1, k = 0; i >= 0; --i, ++k) {
        if (k == 3 || (k > 3 && k % 2 == 1)) out += ',';
        out += s[i];
    }
    return string(out.rbegin(), out.rend());
}

int main() {
    const int raisePct = 8;       // assumed yearly raise on fixed pay
    const int bonusPct = 10;      // performance bonus target, a share of fixed pay
    const int employerPFPct = 6;  // 12% of basic pay, with basic at half the fixed pay
    vector<long long> base(4), joining(4), stock(4);
    long long extraFixed = 100000;  // ask 1: one lakh more fixed pay
    for (int y = 0; y < 4; ++y) {
        base[y] = extraFixed * (100 + bonusPct + employerPFPct) / 100;
        extraFixed = extraFixed * (100 + raisePct) / 100;  // raises are a share of fixed pay
    }
    joining[0] = 100000;                // ask 2: one lakh more joining bonus, paid once
    for (auto& s : stock) s = 200000 / 4;  // ask 3: two lakh more stock, 25% a year, flat price
    for (auto& [name, v] : vector<pair<const char*, vector<long long>>>{
             {"+1 lakh fixed pay", base}, {"+1 lakh joining bonus", joining},
             {"+2 lakh stock grant", stock}}) {
        printf("%-22s", name);
        for (long long x : v) printf(" %9s", inr(x).c_str());
        printf("  total %9s\n", inr(accumulate(v.begin(), v.end(), 0LL)).c_str());
    }
}
```

Output:

```text
+1 lakh fixed pay       1,16,000  1,25,280  1,35,302  1,46,126  total  5,22,708
+1 lakh joining bonus   1,00,000         0         0         0  total  1,00,000
+2 lakh stock grant       50,000    50,000    50,000    50,000  total  2,00,000
```

A lakh more fixed pay is worth ₹5,22,708 over four years under these assumptions, because the bonus and provident fund are percentages of it and raises compound on it. A lakh more joining bonus is worth exactly a lakh, once. Two lakh more stock is worth two lakh only if the share price holds. That is why fixed pay is usually the hardest to move and the most valuable when it does. Companies often find a joining bonus easier to approve, so it is a good first ask.

#### Scripts

**Asking for time**

> Thank you, I'm excited about this offer. I'd like to go through the details carefully, and I'm finishing one other process that ends on Friday. Could I give you my answer by Monday?

**With a competing offer**

> I really want to join your team; the work on the matching engine is my first choice. I have another offer with a higher fixed pay. If you could raise the fixed pay by one lakh, I would be ready to sign this week. I'm happy to share the other offer letter if that helps.

**Without a competing offer**

> Having looked at the role's scope and what I've learned about similar offers, is there any flexibility on the joining bonus? An additional one lakh would make this an easy yes for me.

**Accepting**

> Thank you for looking into it. I'm happy to accept, and I'm looking forward to starting on the 1st.

**Declining the other company**

> Thank you for the offer and for your time throughout the process. I've decided to accept another role that fits my interests more closely. I hope our paths cross again.

Each script names one item and one amount, gives a reason, and says what happens if they agree. Then stop talking and let them answer.

#### What not to do

- Inventing or inflating a competing offer. Recruiters may ask for the letter, and people in the same industry talk.
- Ultimatums or pressure ("I need an answer in an hour").
- Negotiating every line at once; pick the one or two that matter most.
- Reasons about personal spending; stick to the role, the market and other offers.
- Negotiating after you have accepted, or accepting and then backing out. On campus this can break placement rules; anywhere, it burns trust.
- Rudeness to the recruiter, who is usually on your side inside the company.

Connects to: [understanding compensation](#/concept/career.offers.understanding-compensation), [choosing between offers](#/concept/career.offers.choosing-between-offers).

### questions
Q: What should you find out before negotiating a campus offer?
A: Your college's placement rules: whether offers are standard, whether accepting one ends your placement season, and what happens if you decline. Many campus offers leave no room to negotiate.

Q: Why is a raise in fixed pay usually worth more than the same amount as a joining bonus?
A: Fixed pay repeats every year, raises compound on it, and the bonus and provident fund are percentages of it. A joining bonus is paid once and may have to be repaid if you leave early.

Q: What makes a negotiation request effective?
A: It is polite and specific: one item, one amount, a real reason such as a competing offer, and a clear statement that you would accept if they agree. Then you let them respond.

Q: What should you never do when negotiating?
A: Invent or inflate a competing offer, give ultimatums, negotiate after accepting, or accept one offer and then back out. Each damages trust and can cost you the offer.

Q: How do you ask for more time to decide on an offer?
A: Thank them, say you want to review the details carefully and, if true, that another process ends soon, and ask for a specific date. Most companies agree to a short, clear extension.

## career.offers.choosing-between-offers
name: "Choosing between offers"
importance: important
prereqs: [career.offers.understanding-compensation]
scope: "learning, team, growth, compensation"

### simple
Choosing between offers means deciding what matters most to you right now and checking which offer delivers it, rather than picking the biggest number. Writing down the criteria, weighting them and scoring each offer makes the trade-offs visible. It is like choosing a college: rank, course, city and cost all matter, and how much each one weighs decides the answer.

### interview
- Compare on four things: learning (mentors, code quality, scope of work), team (the people and manager you met), growth (skills, promotions, what the role leads to) and compensation (first-year cash, yearly cash, four-year total and risk).
- Score each offer per criterion from evidence gathered in interviews and conversations, not from brand alone.
- Weight the criteria by what matters to you now; early in a career, learning and team often matter more than a small pay difference.
- Check how sensitive the choice is to the weights: if a small change flips it, the offers are close and other factors can decide.
- Drop an offer that is worse on nearly every criterion; the real decision is usually between two.
- Decide by the deadline, tell everyone promptly and graciously, and remember a first job is not forever.

### deep
#### What to compare

- **Learning**: who you would learn from, how code is reviewed, how much of a real system you would own.
- **Team**: the people you met, the manager, how they talked about their work and each other.
- **Growth**: the skills the role builds, what people in it do after two or three years, how promotions work.
- **Compensation**: first-year cash, yearly cash after that, the four-year total, and how risky the stock is ([understanding compensation](#/concept/career.offers.understanding-compensation) shows how to compute them).

#### Kiran's three offers

Kiran (made up) scored three made-up offers out of 10, using notes from the interviews:

| Criterion | A: payments company | B: 30-person startup | C: large firm |
|---|---|---|---|
| Learning | 7: good reviews, narrow scope | 9: owns a service from day one | 6: long onboarding, big codebase |
| Team | 6: met one engineer | 8: met the whole team | 7: friendly, well organized |
| Growth | 7: a steady track | 6: depends on the next funding round | 8: clear promotion path |
| Compensation | 8: strong cash, listed stock | 5: lower cash, illiquid options | 9: highest cash |

#### A weighted decision, and how weights change it

```cpp
// Weighted decision between three made-up offers, and how the choice moves with the weights.
const vector<string> criteria = {"learning", "team", "growth", "compensation"};
const vector<pair<string, vector<double>>> offers = {  // scores out of 10, in criteria order
    {"A payments company", {7, 6, 7, 8}},
    {"B startup", {9, 8, 6, 5}},
    {"C large firm", {6, 7, 8, 9}},
};

// The offer with the highest weighted score; -1 when two share the top (within rounding).
int winner(const vector<double>& w, vector<double>* totals = nullptr) {
    vector<double> t;
    for (auto& [name, scores] : offers)
        t.push_back(inner_product(w.begin(), w.end(), scores.begin(), 0.0));
    if (totals) *totals = t;
    int best = max_element(t.begin(), t.end()) - t.begin();
    for (int o = 0; o < (int)t.size(); ++o)
        if (o != best && t[o] > t[best] - 1e-9) return -1;
    return best;
}

int main() {
    for (auto& [name, w] : vector<pair<string, vector<double>>>{
             {"learning first", {0.4, 0.2, 0.2, 0.2}},
             {"equal weights", {0.25, 0.25, 0.25, 0.25}},
             {"money first", {0.1, 0.2, 0.2, 0.5}}}) {
        vector<double> totals;
        int best = winner(w, &totals);
        printf("%-15s A %.2f  B %.2f  C %.2f  -> %s\n", name.c_str(), totals[0], totals[1],
               totals[2], best < 0 ? "a tie" : offers[best].first.c_str());
    }
    // Sweep the compensation weight; the other three share the rest equally.
    int last = -1;
    for (int k = 0; k <= 1000; ++k) {
        double c = k / 1000.0, other = (1 - c) / 3;
        int best = winner({other, other, other, c});
        if (best != last)
            printf("compensation weight from %.3f: %s\n", c,
                   best < 0 ? "a tie" : offers[best].first.c_str());
        last = best;
    }
    // Every weighting in steps of 0.05: how often does each offer come out on top?
    vector<int> wins(offers.size());
    int total = 0, ties = 0;
    for (int a = 0; a <= 20; ++a)
        for (int b = 0; a + b <= 20; ++b)
            for (int c = 0; a + b + c <= 20; ++c) {
                ++total;
                int w = winner({a / 20.0, b / 20.0, c / 20.0, (20 - a - b - c) / 20.0});
                w < 0 ? ++ties : ++wins[w];
            }
    for (size_t o = 0; o < offers.size(); ++o)
        printf("%-18s wins %4d of %d weightings (%.1f%%)\n", offers[o].first.c_str(), wins[o],
               total, 100.0 * wins[o] / total);
    printf("ties at the top: %d\n", ties);
}
```

Output:

```text
learning first  A 7.00  B 7.40  C 7.20  -> B startup
equal weights   A 7.00  B 7.00  C 7.50  -> C large firm
money first     A 7.30  B 6.20  C 8.10  -> C large firm
compensation weight from 0.000: B startup
compensation weight from 0.143: C large firm
A payments company wins    3 of 1771 weightings (0.2%)
B startup          wins  632 of 1771 weightings (35.7%)
C large firm       wins 1103 of 1771 weightings (62.3%)
ties at the top: 33
```

#### Reading the result

- **Different weights, different winners.** Putting learning first picks the startup (7.40); equal weights and money first pick the large firm (7.50 and 8.10).
- **The flip point is low.** With the other three criteria weighted equally, the startup wins only while compensation carries less than about 0.143 of the weight. If money matters even a little, C wins.
- **Robustness.** Across every weighting in steps of 0.05, C wins 62.3% of them and B 35.7%. A wins 0.2%: C beats it on three of four criteria, so A can drop out early and the real decision is B against C.
- **Ties are rare but real**: 33 weightings put two offers level at the top, a reminder that close scores mean the numbers can't decide alone.

#### Beyond the numbers

The scores are opinions, so improve the evidence before the arithmetic: ask the [questions to ask the interviewer](#/concept/career.behavioral.questions-to-ask-the-interviewer) you skipped, talk to someone who works there, and read the offer terms. Then try two checks: which choice would you regret more in two years, and which is easier to undo? A startup that folds leaves you with experience and a search; a slow team at a large firm can be left through an internal move. Decide by the deadline and decline the others promptly and kindly ([negotiation basics](#/concept/career.offers.negotiation-basics) has a script).

Connects to: [understanding compensation](#/concept/career.offers.understanding-compensation), [negotiation basics](#/concept/career.offers.negotiation-basics), [expected value decisions](#/concept/markets.betting.expected-value-decisions).

### questions
Q: Which criteria should you compare when choosing between offers?
A: Learning, team, growth and compensation, each scored from evidence gathered during interviews and conversations. Compensation should include first-year cash, later yearly cash, the four-year total and the risk in any stock.

Q: Why check how sensitive a weighted decision is to the weights?
A: The weights are rough judgments. If a small change in them flips the winner, the offers are close and other factors such as the team or the location can decide; if the winner holds across most weightings, the choice is robust.

Q: What does it mean when one offer is worse than another on almost every criterion?
A: It is dominated: no reasonable weighting makes it win, so you can drop it early and focus the decision on the offers that trade off against each other.

Q: Why might learning weigh more than pay early in a career?
A: Skills and experience from the first job shape every later offer, and a small pay difference now is often smaller than the difference in what you can earn later. It depends on personal circumstances, such as loans or family needs, which can rightly raise the weight on pay.

Q: What should you do after deciding?
A: Accept in writing by the deadline, then promptly and politely decline the other offers, thanking the people involved. Keep the relationships, since you may apply there again.
