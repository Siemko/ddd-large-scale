import {
  describe,
  expect,
  it,
  beforeAll,
  setSystemTime,
  afterAll,
} from "bun:test";

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

let CURRENT_BALANCE = 1000;

function getInvoiceAmount(invoiceId: string) {
  if (+invoiceId % 2 === 0) {
    return Math.round(Math.random() * 1000) + 1000;
  } else {
    return Math.round(Math.random() * 999);
  }
}

class Invoice {
  id: string;
  #amount: number;
  #supplierName: string;
  #paymentDate: Date;

  constructor(id: string, amount: number) {
    this.id = id;
    this.#amount = amount;
    this.#supplierName =
      amount > 1000 ? "Automotive Supplier" : "Software Supplier";
    this.#paymentDate = new Date(Date.now() + FOURTEEN_DAYS);
  }

  get amount() {
    return this.#amount;
  }

  get supplierName() {
    return this.#supplierName;
  }

  get paymentDate() {
    return this.#paymentDate;
  }

  get __debug() {
    return {
      id: this.id,
      amount: this.#amount,
      supplierName: this.#supplierName,
      paymentDate: this.#paymentDate,
    };
  }
}

class InvoiceRepository {
  getInvoice(invoiceId: string) {
    return new Invoice(invoiceId, getInvoiceAmount(invoiceId));
  }
}

class PaymentRepository {
  payments: Payment[] = [];
  save(payment: Payment) {
    this.payments.push(payment);
    console.log("Payment saved");
  }
}

class Payment {
  #paymentMethod: string;
  #invoice: Invoice;
  #sent: boolean;
  #paymentDate: Date;
  #id: string;

  constructor(paymentMethod: string, invoice: Invoice, companyBalance: number) {
    this.#paymentMethod = paymentMethod;
    this.#invoice = invoice;
    this.#sent = false;
    this.#id = invoice.id;

    let paymentDate: Date = invoice.paymentDate;
    if (invoice.supplierName.startsWith("Auto")) {
      paymentDate = new Date(invoice.paymentDate.getTime() + FIVE_DAYS);
    }
    if (companyBalance < 0) {
      let timeToPay = invoice.paymentDate.getTime() - Date.now();
      paymentDate = new Date(Date.now() + timeToPay * 2);
    }

    this.#paymentDate = paymentDate;
  }

  send() {
    if (this.#sent) {
      throw new Error("Payment already sent");
    }
    this.#sent = true;
    return {
      paymentMethod: this.#paymentMethod,
      amount: this.#invoice.amount,
      supplier: this.#invoice.supplierName,
      paymentDate: this.#paymentDate,
    };
  }

  /**
   * DEBUG ONLY
   */
  get invoiceAmount() {
    return this.#invoice.amount;
  }

  get __debug() {
    return {
      id: this.#id,
      paymentMethod: this.#paymentMethod,
      invoice: this.#invoice.__debug,
      sent: this.#sent,
      paymentDate: this.#paymentDate,
    };
  }
}

class InvoiceService {
  constructor(
    private invoiceRepository: InvoiceRepository,
    private paymentRepository: PaymentRepository
  ) {}
  payInvoice(invoiceId: string, paymentMethod: string) {
    const invoice = this.invoiceRepository.getInvoice(invoiceId);
    const payment = new Payment(paymentMethod, invoice, CURRENT_BALANCE);
    this.paymentRepository.save(payment);
  }
}

describe("pay invoice", () => {
  beforeAll(() => {
    setSystemTime(new Date("2025-06-01T00:00:00.000Z"));
  });
  afterAll(() => {
    setSystemTime();
  });
  it("should save automotive payment to repository when balance is positive", () => {
    CURRENT_BALANCE = 1000;
    const invoiceRepository = new InvoiceRepository();
    const paymentRepository = new PaymentRepository();
    const invoiceService = new InvoiceService(
      invoiceRepository,
      paymentRepository
    );

    invoiceService.payInvoice("124", "credit card");

    console.log(paymentRepository.payments.map((p) => p.__debug));
    expect(paymentRepository.payments.length).toBe(1);

    expect(paymentRepository.payments[0]!.__debug).toMatchObject({
      id: "124",
      paymentMethod: "credit card",
      invoice: {
        id: "124",
        supplierName: "Automotive Supplier",
      },
      sent: false,
    });
  });

  it("should save software payment to repository when balance is negative", () => {
    CURRENT_BALANCE = -1200;
    const invoiceRepository = new InvoiceRepository();
    const paymentRepository = new PaymentRepository();
    const invoiceService = new InvoiceService(
      invoiceRepository,
      paymentRepository
    );

    invoiceService.payInvoice("123", "credit card");

    console.log(paymentRepository.payments.map((p) => p.__debug));
    expect(paymentRepository.payments.length).toBe(1);

    expect(paymentRepository.payments[0]!.__debug).toMatchObject({
      id: "123",
      paymentMethod: "credit card",
      invoice: {
        id: "123",
        supplierName: "Software Supplier",
      },
      sent: false,
    });
  });
});
