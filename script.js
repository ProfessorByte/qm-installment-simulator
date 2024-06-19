const ONE_DOLAR_VALUE_IN_BOB = 6.97;

const vehicles = [
  {
    model: "NEXUS",
    price: 14500,
  },
  {
    model: "E4 PLUS",
    price: 15500,
  },
  {
    model: "E4 SMART",
    price: 8790,
  },
  {
    model: "E4 MONTAÑERO",
    price: 8050,
  },
  {
    model: "E4",
    price: 7900,
  },
  {
    model: "DUKE",
    price: 7140,
  },
];

class Table {
  constructor(
    principal,
    paymentDeadline,
    isMarry = false,
    numberDecimals = 2,
    recalcMonthNumber = 25,
    firstPeriodInterest = 0.035,
    secondPeriodInterest = 0.0699,
    amortizationEveryNumDays = 30
  ) {
    this.principal = principal;
    this.paymentDeadline = paymentDeadline;
    this.isMarry = isMarry;
    this.numberDecimals = numberDecimals;
    this.recalcMonthNumber = recalcMonthNumber - 1;
    this.firstPeriodInterest = firstPeriodInterest;
    this.secondPeriodInterest = secondPeriodInterest;
    this.amortizationEveryNumDays = amortizationEveryNumDays;
    this.installmentsWithVariableInterestRate =
      paymentDeadline - recalcMonthNumber + 1;
    this.rows = [];

    this.addRows();
  }

  displayTable() {
    console.table(this.rows);
  }

  averageQuotaPeriods() {
    const firstPeriodRows = this.rows.slice(0, this.recalcMonthNumber);
    const secondPeriodRows = this.rows.slice(this.recalcMonthNumber);

    return {
      averageFirstPeriod: this.round(
        firstPeriodRows.reduce(
          (acc, row) => acc + row.quota + row.deduction,
          0
        ) / firstPeriodRows.length
      ),
      averageSecondPeriod: this.round(
        secondPeriodRows.reduce(
          (acc, row) => acc + row.quota + row.deduction,
          0
        ) / secondPeriodRows.length
      ),
    };
  }

  addRows() {
    for (let i = 0; i < this.paymentDeadline; i++) {
      let newRow = {
        capitalBalance:
          this.rows.length === 0
            ? this.principal
            : this.rows.at(-1).capitalBalance <= 0.01
            ? 0
            : this.rows.at(-1).capitalBalance -
              this.rows.at(-1).capitalAmortization,
      };
      this.addRow(newRow);
    }
  }

  addRow(newRow) {
    const quota =
      newRow.capitalBalance <= 0.01
        ? 0
        : this.rows.length >= this.recalcMonthNumber
        ? this.rows.length - 1 >= this.recalcMonthNumber
          ? this.rows.at(-1).quota
          : -this.payment(
              (this.secondPeriodInterest * this.amortizationEveryNumDays) / 360,
              this.installmentsWithVariableInterestRate,
              newRow.capitalBalance
            )
        : -this.payment(
            (this.firstPeriodInterest * this.amortizationEveryNumDays) / 360,
            this.paymentDeadline,
            this.principal
          );
    const interests =
      this.rows.length >= this.recalcMonthNumber
        ? (newRow.capitalBalance *
            this.secondPeriodInterest *
            this.amortizationEveryNumDays) /
          360
        : (newRow.capitalBalance *
            this.firstPeriodInterest *
            this.amortizationEveryNumDays) /
          360;

    const capitalAmortization = quota - interests;

    const deduction = this.isMarry
      ? newRow.capitalBalance * (0.001286 / 30) * this.amortizationEveryNumDays
      : newRow.capitalBalance * (0.000714 / 30) * this.amortizationEveryNumDays;

    this.rows.push({
      capitalBalance: newRow.capitalBalance,
      capitalAmortization,
      interests,
      quota,
      deduction,
    });
  }

  payment(rate, nper, pv, fv = 0, type = 0) {
    if (rate === 0) {
      return -(pv + fv) / nper;
    }

    let numerator = rate * (pv * Math.pow(1 + rate, nper) + fv);
    let denominator = (Math.pow(1 + rate, nper) - 1) * (1 + rate * type);

    let payment = numerator / denominator;

    return -payment;
  }

  round(number) {
    if (!this.numberDecimals) return number;
    return (
      Math.round(number * Math.pow(10, this.numberDecimals)) /
      Math.pow(10, this.numberDecimals)
    );
  }
}

const $ = (element) => document.querySelector(element);

const $form = $("#financingForm");
const $vehicleModelInput = $("#vehicleModel");
const $isMarryInput = $("#isMarry");
const $initialDepositInput = $("#initialDeposit");
const $paymentTermInput = $("#paymentTerm");

vehicles.forEach((vehicle) => {
  const option = document.createElement("option");
  option.value = vehicle.price;
  option.text = vehicle.model;
  $vehicleModelInput.appendChild(option);
});

$form.addEventListener("input", calculateInstallments);

function calculateInstallments() {
  const vehicleModelPrice = parseFloat($vehicleModelInput.value);
  const initialDeposit = parseFloat($initialDepositInput.value) ?? NaN;
  const paymentTerm = parseInt($paymentTermInput.value) * 12;

  if (isNaN(vehicleModelPrice) || isNaN(initialDeposit) || isNaN(paymentTerm)) {
    document.getElementById("results").innerHTML =
      "Por favor, complete todos los campos.";
    return;
  }

  const minInitialDeposit = vehicleModelPrice * 0.1;

  if (initialDeposit < minInitialDeposit) {
    document.getElementById(
      "results"
    ).innerHTML = `El aporte inicial debe ser al menos el 10% del precio del vehículo <strong>(USD ${minInitialDeposit.toFixed(
      2
    )})</strong>.`;
    return;
  }

  const principal =
    (vehicleModelPrice - initialDeposit) * ONE_DOLAR_VALUE_IN_BOB;
  const table = new Table(principal, paymentTerm, $isMarryInput.checked);
  const { averageFirstPeriod, averageSecondPeriod } =
    table.averageQuotaPeriods();
  table.displayTable();

  document.getElementById("results").innerHTML = `
    <p><strong>Cuota promedio primeros 2 años (3.5%):</strong> BOB ${averageFirstPeriod}</p>
    <p><strong>Cuota promedio a partir del tercer año (6.99%):</strong> BOB ${averageSecondPeriod}</p>
`;
}
