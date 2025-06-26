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

class Employee {
  id: string;
  #uniqueIdentificationNumber: string;
  #bankAccountNumber: string;
  #baseSalary;

  constructor(
    id: string,
    uniqueIdentificationNumber: string,
    bankAccountNumber: string,
    baseSalary: number
  ) {
    this.id = id;
    this.#uniqueIdentificationNumber = uniqueIdentificationNumber;
    this.#bankAccountNumber = bankAccountNumber;
    this.#baseSalary = baseSalary;
  }

  get uniqueIdentificationNumber() {
    return this.#uniqueIdentificationNumber;
  }

  get bankAccountNumber() {
    return this.#bankAccountNumber;
  }

  get baseSalary() {
    return this.#baseSalary;
  }
}

class EmployeeRepository {
  getEmployee(employeeId: string) {
    return new Employee(
      employeeId,
      "9900223341" + employeeId,
      "1234000056780000" + employeeId,
      12_000
    );
  }
}

class PaymentRepository {
  payments: Payment[] = [];
  save(payment: Payment) {
    this.payments.push(payment);
    console.log("Payment saved");
  }
}

interface PaymentData {
  amount: number;
  recipient: string;
}

class InvoiceDataTranslator {
  static toPaymentData(invoice: Invoice): PaymentData {
    return {
      amount: invoice.amount,
      recipient: invoice.supplierName,
    };
  }
}

class EmployeeDataTranslator {
  static toPaymentData(employee: Employee): PaymentData {
    return {
      amount: employee.baseSalary,
      recipient: employee.bankAccountNumber,
    };
  }
}

class Payment {
  #paymentMethod: string;
  #paymentData: PaymentData;
  #sent: boolean;
  #paymentDate: Date;
  #id: string;

  constructor(
    paymentMethod: string,
    paymentData: PaymentData,
    paymentDate: Date,
    id: string
  ) {
    this.#paymentMethod = paymentMethod;
    this.#paymentData = paymentData;
    this.#sent = false;
    this.#id = id;
    this.#paymentDate = paymentDate;
  }

  send() {
    if (this.#sent) {
      throw new Error("Payment already sent");
    }
    this.#sent = true;
    return {
      paymentMethod: this.#paymentMethod,
      paymentData: this.#paymentData,
      paymentDate: this.#paymentDate,
    };
  }

  get __debug() {
    return {
      id: this.#id,
      paymentMethod: this.#paymentMethod,
      paymentData: this.#paymentData,
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
    let paymentDate: Date = invoice.paymentDate;
    if (invoice.supplierName.startsWith("Auto")) {
      paymentDate = new Date(invoice.paymentDate.getTime() + FIVE_DAYS);
    }
    if (CURRENT_BALANCE < 0) {
      let timeToPay = invoice.paymentDate.getTime() - Date.now();
      paymentDate = new Date(Date.now() + timeToPay * 2);
    }
    const payment = new Payment(
      paymentMethod,
      InvoiceDataTranslator.toPaymentData(invoice),
      paymentDate,
      invoice.id
    );
    this.paymentRepository.save(payment);
  }
}

class PayrollService {
  constructor(
    private employeeRepository: EmployeeRepository,
    private paymentRepository: PaymentRepository
  ) {}
  payEmployee(employeeId: string, paymentMethod: string) {
    const employee = this.employeeRepository.getEmployee(employeeId);
    let paymentDate: Date = new Date(new Date().setDate(10));
    const payment = new Payment(
      paymentMethod,
      EmployeeDataTranslator.toPaymentData(employee),
      paymentDate,
      employee.uniqueIdentificationNumber
    );
    this.paymentRepository.save(payment);
  }
}

describe("payment service", () => {
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
      paymentData: {
        recipient: "Automotive Supplier",
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
      paymentData: {
        recipient: "Software Supplier",
      },
      sent: false,
    });
  });

  it("should save employee payment to repository when balance is positive", () => {
    CURRENT_BALANCE = 1000;
    const employeeRepository = new EmployeeRepository();
    const paymentRepository = new PaymentRepository();
    const payrollService = new PayrollService(
      employeeRepository,
      paymentRepository
    );

    payrollService.payEmployee("124", "bank transfer");

    console.log(paymentRepository.payments.map((p) => p.__debug));
    expect(paymentRepository.payments.length).toBe(1);

    expect(paymentRepository.payments[0]!.__debug).toMatchObject({
      id: "9900223341124",
      paymentMethod: "bank transfer",
      paymentData: {
        amount: 12_000,
        recipient: "1234000056780000124",
      },
      paymentDate: new Date("2025-06-10T00:00:00.000Z"),
      sent: false,
    });
  });

  it("should save employee payment to repository when balance is negative", () => {
    CURRENT_BALANCE = -1200;
    const employeeRepository = new EmployeeRepository();
    const paymentRepository = new PaymentRepository();
    const payrollService = new PayrollService(
      employeeRepository,
      paymentRepository
    );

    payrollService.payEmployee("123", "bank transfer");

    console.log(paymentRepository.payments.map((p) => p.__debug));
    expect(paymentRepository.payments.length).toBe(1);

    expect(paymentRepository.payments[0]!.__debug).toMatchObject({
      id: "9900223341123",
      paymentMethod: "bank transfer",
      paymentData: {
        amount: 12_000,
        recipient: "1234000056780000123",
      },
      paymentDate: new Date("2025-06-10T00:00:00.000Z"),
      sent: false,
    });
  });
});
