export interface HelpStep {
  id: string;
  title: string;
  body: string;
  route: string;
  target?: string;
  example?: { label: string; text: string };
  tip?: string;
}

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: HelpStep[];
}

export const quickTour: HelpTopic = {
  id: "quick-tour",
  title: "The essentials",
  description: "Ten quick stops for everyday workshop work.",
  icon: "BookOpen",
  steps: [
    {
      id: "quick-car",
      title: "Start with the car",
      body: "Search for the car first, or choose Add car. Only the car number is needed; the customer and other details can wait.",
      route: "/cars",
      target: "cars-add",
    },
    {
      id: "quick-quote",
      title: "Offer a price",
      body: "Add a line for each job or part and its price. Save quotation keeps it even if the customer or other details are missing.",
      route: "/quotations/new",
      target: "quotation-lines",
    },
    {
      id: "quick-invoice",
      title: "Save an invoice draft",
      body: "Save draft keeps your work, even with details missing. Finish it later. Review & issue demo is only for test invoices.",
      route: "/invoices/new",
      target: "invoice-save",
    },
    {
      id: "quick-supplier",
      title: "Keep a supplier's bill",
      body: "Choose the supplier, car and total, and add a photo if you have one. Save a draft, or Record amount owed when ready; payment comes separately.",
      route: "/bills/new?direction=PURCHASE",
      target: "bill-total",
    },
    {
      id: "quick-money",
      title: "Money received or spent",
      body: "Choose money in or money out, then follow Who, Amount, What for and Save. Green marks money in; red marks money out.",
      route: "/payments/new",
      target: "money-types",
    },
    {
      id: "quick-advance",
      title: "Money given to a worker",
      body: "Name the worker, enter what you handed over, then choose Give money in advance. Record their later spending separately.",
      route: "/payments/new?direction=OUT&purpose=ADVANCE&step=who",
      target: "money-person",
    },
    {
      id: "quick-worker-spent",
      title: "The worker spent for us",
      body: "Enter the full cost and choose who paid for the workshop. Keep the supplier and the worker as separate names; check the receipt before confirming the claim.",
      route: "/payments/new?kind=PERSON_SPENT&step=amount",
      target: "money-amount",
      example: {
        label: "Starting with no earlier balance",
        text: "Given 500 SAR, spent 650 SAR: we owe the worker 150 SAR, subject to checking the expense.",
      },
    },
    {
      id: "quick-people",
      title: "Who owes whom?",
      body: "Each person can have amounts owed both ways. Open their account to see invoices, supplier bills and other money records together, counted once.",
      route: "/people",
      target: "people-list",
    },
    {
      id: "quick-history",
      title: "Check or correct a record",
      body: "Open a money record to see its details and receipts. Correct this record keeps the original history; bill-linked corrections open from the bill.",
      route: "/payments",
      target: "money-history",
    },
    {
      id: "quick-settings",
      title: "The less frequent jobs live here",
      body: "More & settings holds workshop details, saved services, older receipts and reports. Reopen ? for this short tour or choose a topic when you need more help.",
      route: "/settings",
      target: "settings-links",
    },
  ],
};

export const helpTopics: HelpTopic[] = [
  {
    id: "getting-started",
    title: "Start here",
    description: "Find your way around and see today's money.",
    icon: "LayoutDashboard",
    steps: [
      {
        id: "start-guide",
        title: "Learn one thing at a time",
        body: "This guide explains the buttons; it does not save any records for you. You can close it and open ? whenever you need help.",
        route: "/dashboard",
        target: "workspace-main",
        tip: "Save unfinished work before starting a tour; Next takes you to the next screen.",
      },
      {
        id: "start-menu",
        title: "Your everyday pages",
        body: "Use Today, Cars, Money book and People for daily work. The menu button hides or opens the side menu; on a phone, the main pages are also along the bottom.",
        route: "/dashboard",
        target: "main-menu",
      },
      {
        id: "start-search",
        title: "Find a record quickly",
        body: "Type a car plate, person's name or document number in the search at the top. Choose a result to open it.",
        route: "/dashboard",
        target: "global-search",
      },
      {
        id: "start-record",
        title: "Record what just happened",
        body: "Choose Money received or Money paid. Add a name, the total and payment timing, then choose what it was for. Select the existing invoice or bill when paying saved work.",
        route: "/dashboard",
        target: "today-actions",
      },
      {
        id: "start-next",
        title: "Choose one useful next action",
        body: "What to do next explains payments to follow up, supplier bills to plan and worker records to check. Open a suggestion to see its evidence before acting.",
        route: "/dashboard",
        target: "today-next",
        tip: "Suggestions use the saved records. They are not a prediction of money available.",
      },
      {
        id: "start-totals",
        title: "Read today's numbers",
        body: "Came in and Went out show recorded workshop money movement for today. The difference is not profit or a counted cash-drawer balance.",
        route: "/dashboard",
        target: "today-money",
        tip: "Latest records lets you check what was just entered; Finish later shows saved quotation and invoice drafts.",
      },
    ],
  },
  {
    id: "cars",
    title: "A car from arrival to payment",
    description: "Save the car, its work, costs and customer payments.",
    icon: "Car",
    steps: [
      {
        id: "cars-find",
        title: "Find the car first",
        body: "Search by car number, customer name or phone before adding another car. Open the matching car to see its records.",
        route: "/cars",
        target: "cars-search",
      },
      {
        id: "cars-add",
        title: "Save the car with what you know",
        body: "Choose Add car. Only the car number is needed; leave other unknown details empty and add them later.",
        route: "/cars",
        target: "cars-add",
        tip: "For a company car, keep the company as the customer. The person who brings it can be saved as its representative or contact. Chassis / VIN is inside Car details and notes.",
      },
      {
        id: "cars-edit",
        title: "Add details as you learn them",
        body: "Use Edit car to change or clear the car number, customer or other details. Use Edit customer to correct the customer's own name and phone.",
        route: "/cars",
        target: "car-edit",
        tip: "Changing the car's customer does not move old bills or debts to the new customer.",
      },
      {
        id: "cars-together",
        title: "Same customer shows more than once?",
        body: "Open Cars, then By customer. Press Put cars together. Choose the names for the same customer. Under Use this name, choose the name you want. Press Put cars together. The button shows how many cars will be included. The cars will now show under that name.",
        route: "/cars",
        target: "cars-together",
        tip: "Will this change old bills or payments? No. This puts the cars together. Old bills and payments stay as they are.",
      },
      {
        id: "cars-put-back",
        title: "Made a mistake?",
        body: "Press Put back after saving. You can also find it on that customer's car page. If a car was moved again later, open that car and change its customer.",
        route: "/cars",
        target: "cars-together",
        tip: "Only one car is under the wrong name? Open that car. Press Edit car, change Customer, and save.",
      },
      {
        id: "cars-work",
        title: "Write the work and agreed price",
        body: "Choose Customer bill for work you charge the customer, and add the jobs or parts. If you only know the total, choose I only know the total price.",
        route: "/cars",
        target: "car-bill",
        example: {
          label: "Example",
          text: "Brake work 300 SAR and oil change 100 SAR: the bill total is 400 SAR.",
        },
        tip: "Take photo or Choose photo or PDF adds files before you save the customer bill.",
      },
      {
        id: "cars-charge",
        title: "Charge the work once",
        body: "A Customer bill with a customer records what they owe; without one it stays a draft to finish later. Use either this bill or an invoice for the same work, so the customer is not charged twice.",
        route: "/cars",
        target: "car-documents",
        tip: "Use Finish draft after adding the missing customer; adding a customer to the car does not finish old drafts automatically.",
      },
      {
        id: "cars-supplier",
        title: "Record each car cost once",
        body: "Use Add cost / payment for a new purchase, outside work or a worker’s spending. Use Save supplier bill when entering a bill you received. If it is already saved, link that bill instead of entering it again.",
        route: "/cars",
        target: "car-supplier-bills",
        tip: "These are two ways to record the same cost. Do not use both for one purchase. Attach a receipt to the saved cost whenever you receive it.",
      },
      {
        id: "cars-cash",
        title: "Record the payment and cost separately",
        body: "Use Money received to pay an existing customer bill or invoice. Add cost / payment shows saved supplier bills first; choose Record a different cost only when that cost has not already been saved.",
        route: "/cars",
        target: "car-money-actions",
        example: {
          label: "Do not keep only the difference",
          text: "A customer pays 1,000 SAR and you buy parts for 200 SAR: record 1,000 received and 200 spent, not just 800 received.",
        },
      },
      {
        id: "cars-costs",
        title: "See whether this car covered its costs",
        body: "Compare Work charged with Direct car costs. Costs count when incurred, even if a supplier or worker has not been paid yet. Charge less car costs is the job difference before shared workshop costs.",
        route: "/cars",
        target: "car-cost-summary",
        tip: "Customer payments and workshop cash are shown separately. A company employee can pay its bill; the company remains the customer.",
      },
      {
        id: "cars-history",
        title: "Check what is still left",
        body: "Open each cost and payment behind the totals to see who bought, paid or collected, when it happened, and its receipt. Keep the car's registration and other files in Car photos and documents below.",
        route: "/cars",
        target: "car-work",
        tip: "Money received means money that reached the workshop; a worker may still hold another payment. Cash difference alone does not show the profit on this car.",
      },
    ],
  },
  {
    id: "money",
    title: "Record money in five steps",
    description: "In or out, a name, the amount, what for, then save.",
    icon: "HandCoins",
    steps: [
      {
        id: "money-choice",
        title: "Start with money in or money out",
        body: "Choose Money in for customer work or incoming money. Choose Money out for purchases or outgoing money. Both also let you record payment due later.",
        route: "/payments/new",
        target: "money-types",
      },
      {
        id: "money-who",
        title: "Type a name or choose an existing one",
        body: "Name the customer or supplier this belongs to. Choose their saved name when it appears; otherwise the name you type can be saved with the record.",
        route: "/payments/new?direction=IN&step=who",
        target: "money-person",
      },
      {
        id: "money-payer",
        title: "Someone paid for the customer",
        body: "Keep the customer in the main name field. Select Someone else is paying for this customer and enter the person who actually paid.",
        route: "/payments/new?direction=IN&step=who",
        target: "money-person",
        tip: "The payer is recorded as evidence. The customer’s invoice and balance stay with the customer.",
        example: {
          label: "A company car",
          text: "MJCC is the customer; Ali brings the car and pays from his own pocket. Keep MJCC as the customer and record Ali as the payer. This reduces MJCC’s bill; it does not make the workshop owe Ali.",
        },
      },
      {
        id: "money-amount",
        title: "Enter the total and when it is paid",
        body: "Enter the full amount. Choose paid now, pay later or part paid, then enter only the part received or paid today. Use the actual date.",
        route: "/payments/new?direction=OUT&step=amount",
        target: "money-amount",
        tip: "A 600 SAR purchase with 200 SAR paid now leaves 400 SAR owed. Do not record the purchase again when paying the rest.",
      },
      {
        id: "money-handler",
        title: "Who received or paid the money?",
        body: "Choose The workshop, or A worker / someone else and name them. A worker’s collection or spending changes their account without pretending cash reached or left the workshop again.",
        route: "/payments/new?direction=OUT&step=amount",
        target: "money-handler",
      },
      {
        id: "money-purpose",
        title: "Choose what this record is for",
        body: "Use new work or purchase only when it has not already been recorded. For an existing invoice or bill, choose its payment option and select that saved record.",
        route: "/payments/new?direction=OUT&step=purpose",
        target: "money-kind",
        tip: "For an old money-book debt without an invoice, use Handover / balance payment or Pay someone back. Name the worker under Who handled it if they collected or paid for the workshop. No new sale or expense is added.",
      },
      {
        id: "money-advance",
        title: "Keep a customer advance for later",
        body: "Choose Customer advance when payment comes before the work is charged. When the invoice is ready, select the saved advance in its payment flow.",
        route: "/payments/new?direction=IN&purpose=ADVANCE&step=purpose",
        target: "money-kind",
        tip: "Applying an advance moves no new cash. You can apply part and keep the rest available.",
      },
      {
        id: "money-photo",
        title: "Keep the receipt with the record",
        body: "Add a short description, choose the car if relevant, and use Take photo or Choose files before saving.",
        route: "/payments/new?direction=OUT&step=purpose",
        target: "money-photos",
        tip: "If the record saves but a photo fails, retry the photo on that screen. Do not create the money record again.",
      },
      {
        id: "money-save",
        title: "Check, save and finish",
        body: "Check the person, total, payment timing and who handled the money. Choose Save record. You return to the car, person or document with a saved message.",
        route: "/payments/new?direction=OUT&step=review",
        target: "money-save",
        tip: "Nothing is recorded by this help tour. Back lets you change details before saving.",
      },
    ],
  },
  {
    id: "workers",
    title: "Money handled by a worker",
    description:
      "Advances, spending, customer collections and the final handover.",
    icon: "Users",
    steps: [
      {
        id: "workers-advance",
        title: "Give a worker money in advance",
        body: "Choose Money out, name the worker, then choose Give money in advance at What for. Record what they later buy separately.",
        route: "/payments/new?direction=OUT&purpose=ADVANCE&step=purpose",
        target: "money-kind",
      },
      {
        id: "workers-spent",
        title: "The worker bought something for us",
        body: "Name the supplier as the main person when known. Enter the full cost, then choose A worker / someone else under Who paid and name the worker.",
        route: "/payments/new?kind=PERSON_SPENT&step=amount",
        target: "money-handler",
        tip: "Their own money, an earlier advance, or both belong in the same worker account. For a saved supplier bill, select that bill instead of adding a second expense.",
      },
      {
        id: "workers-check",
        title: "Check reported spending",
        body: "Open the worker’s account and review expenses marked for checking. Read the note and receipt before marking the expense checked.",
        route: "/payments",
        target: "money-history",
        tip: "The claim is already included in the recorded balance. Checking it does not add the expense again.",
      },
      {
        id: "workers-collected",
        title: "The worker received customer money",
        body: "Keep the customer as the main person. Under Who received the money, choose the worker. Select the existing customer invoice at What for when one is already saved.",
        route: "/payments/new?kind=PERSON_COLLECTED&step=amount",
        target: "money-handler",
        tip: "The customer’s bill can be paid while the worker still has the money. Record the worker’s handover separately.",
      },
      {
        id: "workers-old-debt",
        title: "The worker handles an older debt",
        body: "If there is no invoice, keep the person who owes the money as the main name. Choose Handover / balance payment, then select the worker under Who received the money.",
        route: "/payments/new?direction=IN&purpose=RETURN&step=amount",
        target: "money-handler",
        tip: "For a worker paying a supplier’s old debt, choose Money out and Pay someone back; keep the supplier as the main name and the worker under Who paid. Both accounts update without adding the cost again.",
      },
      {
        id: "workers-returned",
        title: "Record the handover",
        body: "When the worker hands money to the workshop, choose Money in, name that worker and select Handover / balance payment. Keep The workshop as the receiver. To reimburse the worker, choose Money out and Pay someone back, with The workshop as the payer.",
        route: "/payments/new?direction=IN&purpose=RETURN&step=purpose",
        target: "money-kind",
        tip: "Record a 1,000 SAR collection, a 200 SAR expense and an 800 SAR handover as three events, not one difference.",
      },
      {
        id: "workers-finish",
        title: "Review both sides together",
        body: "Open the worker in People. See what they owe, what the workshop owes, and the records behind each amount. The difference is a comparison, not proof of cash physically held.",
        route: "/people",
        target: "people-list",
        tip: "One person can also be a customer or supplier. Their saved roles do not decide which side owes money.",
      },
    ],
  },
  {
    id: "people",
    title: "Who owes whom?",
    description: "One person can be a customer, supplier and worker.",
    icon: "Users",
    steps: [
      {
        id: "people-add",
        title: "Keep one record for each person",
        body: "Search for their name or phone first, then use Add person if they are missing. Select every role that fits, including both customer and supplier when needed.",
        route: "/people",
        target: "people-add",
      },
      {
        id: "people-balance",
        title: "Read the words beside the amount",
        body: "They owe us and We owe them show both sides of one account, including linked invoices, supplier bills and other money-book records. Bills are counted once.",
        route: "/people",
        target: "people-balances",
      },
      {
        id: "people-link",
        title: "Match their invoice customer record",
        body: "Under Customer invoices, open Link invoices already made for this person if their customer record is separate. Choose the same person's customer record to show their invoices here.",
        route: "/people",
        target: "person-customer-invoices",
        tip: "Link only the same person or business; a similar name is not enough.",
      },
      {
        id: "people-net",
        title: "A net balance is not a paid invoice",
        body: "A person can owe us for work while we owe them for parts. Open the supplier bill and use Settle against another invoice to record an agreed offset. Simply comparing the amounts does not settle them.",
        route: "/people",
        target: "people-balances",
        example: {
          label: "Example",
          text: "They owe 1,000 SAR and we owe 700 SAR: after an agreed 700 SAR offset, 300 SAR is left for them to pay.",
        },
      },
      {
        id: "people-history",
        title: "Open the records behind the number",
        body: "Open any row to see its description, receipt and balance before and after it. Use Expenses to check to review reported costs. Add an old balance only for an amount that has not already been recorded.",
        route: "/people",
        target: "person-history",
      },
    ],
  },
  {
    id: "history",
    title: "Find receipts and fix mistakes",
    description: "Check saved records without hiding the original story.",
    icon: "ReceiptText",
    steps: [
      {
        id: "history-find",
        title: "Find the entry",
        body: "In Money book, search a name, car, amount or note. Use Money in, Money out, To check, or the date filters to narrow the list.",
        route: "/payments",
        target: "money-filters",
      },
      {
        id: "history-open",
        title: "Tap a record to see more",
        body: "Open a row to see when it was saved, its payment method, reference, person and car. Linked bills and invoices open from the same record.",
        route: "/payments",
        target: "money-history",
      },
      {
        id: "history-receipt",
        title: "Keep the receipt with the record",
        body: "Use Take photo or Choose photo or PDF before saving a bill. Money entries also accept photos before saving. You can open any saved record to find its files or add more.",
        route: "/bills/new?direction=PURCHASE",
        target: "bill-editor",
        tip: "Large photos are made smaller when possible; PDFs must be 2 MB or less. Attaching a receipt does not create another payment.",
      },
      {
        id: "history-correct",
        title: "Correct an entry with a reason",
        body: "Open Correct this record, explain the mistake and reverse it, then add the right entry. For a bill-linked record, open the bill to undo its payment or offset there.",
        route: "/payments",
        target: "money-history",
        tip: "The original stays visible, so the owner can see what changed.",
      },
      {
        id: "history-export",
        title: "Give someone the records to review",
        body: "Use the Money book export to download the records matching your filters. Record history in More & settings shows when application events happened and can export its log.",
        route: "/audit",
        target: "audit-history",
        tip: "Exports are copies for review, not a full database backup.",
      },
    ],
  },
  {
    id: "quotations",
    title: "Make and share a quotation",
    description:
      "Offer a price, save it unfinished and turn it into an invoice.",
    icon: "FileText",
    steps: [
      {
        id: "quotes-start",
        title: "Start or reopen a quotation",
        body: "Choose New quotation, or search the list and open an existing one. The status filters help you find drafts, sent offers and converted quotations.",
        route: "/quotations",
        target: "quotations-list",
      },
      {
        id: "quotes-draft",
        title: "Save what you know",
        body: "Choose the customer and car when known, and enter the dates you have. Save quotation works even with a missing customer or unfinished items.",
        route: "/quotations/new",
        target: "quotation-save",
        tip: "Use the Back link to return after saving; a quotation is an offer, not a payment.",
      },
      {
        id: "quotes-lines",
        title: "Describe the actual work",
        body: "Add a line for each service or part, or choose Add saved item. Check the quantity, price, total and Calculate VAT setting, then add any useful message or terms.",
        route: "/quotations/new",
        target: "quotation-lines",
        example: {
          label: "Clear work description",
          text: "Replace front brake pads is easier to check later than writing only repair.",
        },
      },
      {
        id: "quotes-share",
        title: "Print or share the saved offer",
        body: "Open the saved quotation and choose Print / Save PDF, or use its sharing menu for WhatsApp or email. Sharing prepares a message and link; attach the saved PDF yourself when you need to send the document file.",
        route: "/quotations",
        target: "quotation-actions",
        tip: "A link to this computer may not open on the customer's device; the PDF can be sent as a file.",
      },
      {
        id: "quotes-status",
        title: "Keep its status up to date",
        body: "After sending the offer, use Record as sent; that button does not send a message. More contains accepted, declined or expired actions when they apply.",
        route: "/quotations",
        target: "quotation-actions",
      },
      {
        id: "quotes-convert",
        title: "Turn the offer into an invoice draft",
        body: "Choose Convert on the saved quotation and pick the customer type. Review the new invoice draft before taking its next step; conversion does not record a payment.",
        route: "/quotations",
        target: "quotation-actions",
        tip: "Use Make a copy when you need a separate new offer based on an old one.",
      },
    ],
  },
  {
    id: "invoices",
    title: "Invoices made for customers",
    description: "Drafts, payments and corrections for invoices created here.",
    icon: "ReceiptText",
    steps: [
      {
        id: "invoices-register",
        title: "Your customer invoices",
        body: "Invoices shows amounts you charge customers. Supplier bills has its own menu page for purchases. Use status, date and search filters in either list.",
        route: "/invoices",
        target: "invoices-register",
      },
      {
        id: "invoices-draft",
        title: "Make a draft without getting stuck",
        body: "Choose Make invoice and add the customer, car, dates and work lines you know. Save draft works with missing details, and you can reopen it later.",
        route: "/invoices/new",
        target: "invoice-save",
      },
      {
        id: "invoices-review",
        title: "Check the customer and prices",
        body: "Choose Business for a VAT-registered company or Customer for an individual, then check the items and preview. Review & issue demo shows missing details; complete the required customer, dates, work lines and workshop details, or save the draft for later.",
        route: "/invoices/new",
        target: "invoice-lines",
      },
      {
        id: "invoices-test",
        title: "Understand Issue sandbox copy",
        body: "Issue sandbox copy locks a test invoice and records no payment. It does not send anything to ZATCA or create a live Saudi tax invoice.",
        route: "/invoices/new",
        target: "invoice-editor",
        tip: "Keep using the workshop's live invoicing system for official invoices; the app's readiness steps are in E-invoicing setup.",
      },
      {
        id: "invoices-payment",
        title: "Record a full or part payment",
        body: "Open an eligible issued invoice and choose Record payment, entering only what was actually paid. Its Payments tab shows payments and offsets separately; do not enter the same payment again as new work.",
        route: "/invoices",
        target: "invoice-actions",
        example: {
          label: "Part payment",
          text: "Invoice total 1,000 SAR and payment 200 SAR: 800 SAR remains to collect.",
        },
      },
      {
        id: "invoices-correction",
        title: "Use the right correction",
        body: "Edit a draft while it is unfinished; an issued copy cannot be edited in place. Its More actions can start a linked credit or debit note, and Credit and debit notes lists these corrections.",
        route: "/notes",
        target: "workspace-main",
        tip: "A credit note reduces the customer amount; an agreed supplier-bill offset is a different action, covered in Settle both sides.",
      },
    ],
  },
  {
    id: "invoice-records",
    title: "Read a saved invoice",
    description: "Print it, check payments and understand its history.",
    icon: "ReceiptText",
    steps: [
      {
        id: "invoice-record-open",
        title: "Open the invoice's own page",
        body: "Open an invoice from Invoices to see its document, status and amount left. Drafts can still be edited; Locked means the issued copy cannot be changed in place.",
        route: "/invoices",
        target: "invoice-actions",
      },
      {
        id: "invoice-record-share",
        title: "Print or save a copy",
        body: "Use Print / Save PDF for a paper copy or PDF file. The sharing menu prepares a message and link; attach the PDF yourself if the customer needs the actual file.",
        route: "/invoices",
        target: "invoice-actions",
        tip: "A link to this computer may not work on another device.",
      },
      {
        id: "invoice-record-payments",
        title: "Check payments and supporting files",
        body: "Choose Payments to see payments, supplier-bill offsets and supporting receipts. Attaching a photo or PDF there does not record another payment.",
        route: "/invoices",
        target: "invoice-tabs",
      },
      {
        id: "invoice-record-evidence",
        title: "See when the document changed",
        body: "Choose Timeline for the invoice's saved events, or Compliance evidence for its test records. Test evidence does not mean the invoice has live tax approval.",
        route: "/invoices",
        target: "invoice-tabs",
        tip: "More actions can duplicate the document into a new draft; deleting a draft is available only when allowed.",
      },
      {
        id: "invoice-record-bad-debt",
        title: "If an amount will not be collected",
        body: "When available, Record bad debt above these tabs removes the remaining amount from collection without a payment or tax credit note. Use it only after the owner or accounts person decides to write that amount off.",
        route: "/invoices",
        target: "invoice-tabs",
      },
    ],
  },
  {
    id: "bills",
    title: "Supplier bills and older sales invoices",
    description: "Keep documents received or already made elsewhere.",
    icon: "ReceiptText",
    steps: [
      {
        id: "bills-direction",
        title: "Choose which way the invoice goes",
        body: "Choose Save supplier bill for an invoice we received. Choose Record an older sales invoice for a customer invoice already made elsewhere, including your live invoicing system.",
        route: "/invoices",
        target: "invoices-actions",
      },
      {
        id: "bills-person",
        title: "Choose the person or shop",
        body: "Select an existing person or use Add a person or shop. When they also have invoices made here, match their customer record so both sides can be settled together.",
        route: "/bills/new",
        target: "bill-person",
      },
      {
        id: "bills-draft",
        title: "Save even if the details are missing",
        body: "Enter the full invoice total, including any tax, plus the number, date and a short note when known. Save draft keeps an unfinished record without changing anyone's balance.",
        route: "/bills/new",
        target: "bill-total",
        tip: "Choose the car near the top, and add a photo or PDF before saving if you have one. Due date and category are under other details.",
      },
      {
        id: "bills-existing",
        title: "Was the charge already entered?",
        body: "If you already recorded this exact amount as Pay later, choose that earlier record under other details. This links the invoice to the old charge instead of charging it twice.",
        route: "/bills/new",
        target: "bill-editor",
      },
      {
        id: "bills-record",
        title: "Record the amount owed",
        body: "When the person, date and positive total are filled in, choose Record amount owed. This creates the debt, not a cash payment. You can still update its payment date and car link later.",
        route: "/bills/new",
        target: "bill-editor",
      },
      {
        id: "bills-due-date",
        title: "Keep the payment date up to date",
        body: "Open the saved bill and choose Add payment date or Change date beside Payment date agreed. Today uses that date to suggest a follow-up. Changing it does not change the amount owed.",
        route: "/bills",
        target: "bill-detail",
      },
      {
        id: "bills-check",
        title: "Open the saved record to finish it",
        body: "Use We paid or Customer paid for a payment, including part payments. The record shows its total, matched payments, offsets, amount left and the history behind them.",
        route: "/invoices",
        target: "bill-detail",
        tip: "Payments matched can include money a worker collected and still holds; it does not always mean cash reached the workshop.",
      },
    ],
  },
  {
    id: "settlements",
    title: "Settle both sides without double counting",
    description: "Offsets, earlier payments and undoing a wrong settlement.",
    icon: "ArrowRight",
    steps: [
      {
        id: "settle-same-person",
        title: "Both invoices must belong to the same person",
        body: "Open an unpaid supplier bill and choose Settle against another invoice. Select the same person's unpaid sales invoice; link their customer record in People first if needed.",
        route: "/invoices",
        target: "bill-detail",
      },
      {
        id: "settle-agreement",
        title: "Write the amount you agreed",
        body: "Enter the offset amount, agreement date and a few words about the agreement. Check the preview of what will remain on both invoices, then choose Save agreed offset.",
        route: "/invoices",
        target: "bill-settlements",
        example: {
          label: "No cash changes hands",
          text: "We owe 700 SAR and they owe 1,000 SAR: offset 700 SAR, leaving 300 SAR for them to pay.",
        },
      },
      {
        id: "settle-no-cash",
        title: "Do not add a cash payment for an offset",
        body: "An offset reduces both invoices without recording money in or out. It appears in both histories so the agreement can be checked later.",
        route: "/invoices",
        target: "bill-settlements",
      },
      {
        id: "settle-earlier-payment",
        title: "Link money already recorded",
        body: "Choose the saved bill or invoice and use an earlier payment or advance when it was already recorded. Applying it reduces the amount left without adding the same money again.",
        route: "/invoices",
        target: "bill-detail",
        tip: "Apply only the amount needed. The unused part stays available for later; matching does not create another payment.",
      },
      {
        id: "settle-undo",
        title: "Undo a wrong payment or offset",
        body: "In Payments and offsets, choose Undo and give the reason. Undoing an earlier-payment link removes only that link; the original money record stays unchanged.",
        route: "/invoices",
        target: "bill-settlements",
      },
      {
        id: "settle-cancel",
        title: "Cancel a bill without losing its history",
        body: "Use Cancel this record and explain why it should no longer count. Undo active payments or offsets first; the cancelled bill and its history remain visible.",
        route: "/invoices",
        target: "bill-detail",
      },
    ],
  },
  {
    id: "saved-details",
    title: "Customer details, saved items and older receipts",
    description:
      "Keep useful details without recording the same expense twice.",
    icon: "FileText",
    steps: [
      {
        id: "details-customers",
        title: "Customer details for printed documents",
        body: "Customers holds names, phone numbers and invoice identity details. Search and open a customer to see their linked cars, quotations and invoices, or edit their details.",
        route: "/customers",
        target: "customers-list",
      },
      {
        id: "details-new-customer",
        title: "Add a customer when needed",
        body: "New customer lets you enter contact and billing details for documents. If the person already exists in People, link this customer record there instead of creating another person.",
        route: "/customers/new",
        target: "workspace-main",
      },
      {
        id: "details-items",
        title: "Reuse common services and parts",
        body: "Saved services & parts stores an item code, description, unit and price. Add common work here, then choose Add saved item while making a quotation or invoice.",
        route: "/items",
        target: "items-list",
        tip: "Check the tax category with the person responsible for the accounts; a saved price can still need changing for a particular job.",
      },
      {
        id: "details-old-expenses",
        title: "Earlier expense receipts",
        body: "This older Expenses screen keeps supplier costs with separate before-tax and tax amounts. Use Money book or supplier bills for the new everyday flow, and check before entering an expense that already exists here.",
        route: "/expenses",
        target: "expenses-list",
        tip: "An amount entered in both the old expense screen and the new flow can be counted twice.",
      },
    ],
  },
  {
    id: "reports",
    title: "Amounts to collect and reports",
    description:
      "Review unpaid documents, export records and understand report limits.",
    icon: "ChartBar",
    steps: [
      {
        id: "reports-register",
        title: "Review unpaid sales and supplier bills",
        body: "Use Invoices for customer amounts and Supplier bills for purchases. Filter for unpaid records, then open one to check its total, payments, offsets and amount left.",
        route: "/invoices",
        target: "invoices-register",
        tip: "The register export follows the filters you chose.",
      },
      {
        id: "reports-overdue",
        title: "Which customer amounts need following up?",
        body: "Customer money to collect includes invoices made here and recorded customer bills. Missing payment dates appear separately. Invoices awaiting clearance are excluded until they can be collected.",
        route: "/reports/receivables",
        target: "receivables-report",
      },
      {
        id: "reports-tax",
        title: "Use the tax report for review",
        body: "Choose a date range to see tax from posted invoices made here and recorded expenses from the older Expenses screen. The new supplier-bill and money-book totals do not automatically provide a tax breakdown here.",
        route: "/reports/vat",
        target: "vat-report",
        tip: "This report is not a filed VAT return; give it to the person responsible for checking the accounts.",
      },
      {
        id: "reports-records",
        title: "Check the records before trusting a total",
        body: "Missing entries, duplicate expenses and unchecked worker claims can change the result. Open the records behind a number and compare them with receipts and actual money on hand.",
        route: "/payments",
        target: "money-history",
      },
    ],
  },
  {
    id: "settings",
    title: "Workshop details and setup",
    description: "Occasional tasks, saved data and live-invoice limits.",
    icon: "Settings",
    steps: [
      {
        id: "settings-menu",
        title: "More & settings holds occasional tasks",
        body: "Use this page for workshop details, customer details, saved items, older expenses and reports. Daily money recording stays in Today, Cars, Money book and People.",
        route: "/settings",
        target: "settings-links",
      },
      {
        id: "settings-business",
        title: "Keep the workshop's identity correct",
        body: "Workshop details contains the legal name, contact details, VAT identity and address used on documents. Check the fields and save changes when the information is correct.",
        route: "/organisation",
        target: "organisation-form",
        tip: "Changing workshop details does not rewrite copies already issued.",
      },
      {
        id: "settings-storage",
        title: "Know where your records are saved",
        body: "The menu says Shared database or Saved on this computer. Local records belong to this app's computer; shared access and backups need the correct setup.",
        route: "/settings",
        target: "main-menu",
        tip: "Wait for Saved before leaving a form; a draft is saved only after you choose its save button.",
      },
      {
        id: "settings-live",
        title: "Live e-invoicing needs separate setup",
        body: "E-invoicing setup shows the current connection and readiness steps. While it says ZATCA is not connected, the app makes test copies only; your live invoice system is still needed.",
        route: "/compliance",
        target: "compliance-setup",
        tip: "Ask the person managing the invoicing setup to handle credentials and official checks; do not treat a test copy as a live tax invoice.",
      },
    ],
  },
];

export function topicForPath(path: string): string | undefined {
  const pathname = path.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (pathname === "/" || pathname === "/dashboard") return "getting-started";
  if (pathname === "/cars" || pathname.startsWith("/cars/")) return "cars";
  if (pathname === "/payments/new") return "money";
  if (pathname === "/payments") return "history";
  if (pathname === "/people" || pathname.startsWith("/people/"))
    return "people";
  if (pathname === "/quotations" || pathname.startsWith("/quotations/"))
    return "quotations";
  if (["/bills", "/bills/new", "/invoices/record"].includes(pathname))
    return "bills";
  if (pathname.startsWith("/bills/")) return "settlements";
  if (
    /^\/invoices\/[^/]+$/.test(pathname) &&
    !["/invoices/new", "/invoices/record"].includes(pathname)
  )
    return "invoice-records";
  if (
    pathname === "/invoices" ||
    pathname.startsWith("/invoices/") ||
    pathname === "/notes"
  )
    return "invoices";
  if (
    pathname === "/customers" ||
    pathname.startsWith("/customers/") ||
    pathname === "/items" ||
    pathname === "/expenses"
  )
    return "saved-details";
  if (pathname === "/audit") return "history";
  if (pathname.startsWith("/reports/")) return "reports";
  if (["/settings", "/organisation", "/compliance"].includes(pathname))
    return "settings";
  return undefined;
}

export const HELP_OPEN_EVENT = "workshop-help:open";

/** Opens the guide at one step, e.g. from a "How to use this" link. */
export function openHelp(topicId: string, stepId?: string) {
  window.dispatchEvent(
    new CustomEvent(HELP_OPEN_EVENT, { detail: { topicId, stepId } }),
  );
}
