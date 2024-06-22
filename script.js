const ONE_DOLAR_VALUE_IN_BOB = 6.97;
const FIRST_PERIOD_INTEREST = 0.035;
const SECOND_PERIOD_INTEREST = 0.0699;

const vehicles = [
  {
    model: "Quantum NEXUS con batería de Litio LiFePO4",
    price: 14500,
  },
  {
    model: "Quantum E4 PLUS con batería de Litio 60V/105Ah ",
    price: 9480,
  },
  {
    model: "Quantum E4 SMART con batería de Litio 60V/105Ah ",
    price: 8790,
  },
  {
    model: "Quantum E4 MONTAÑERO con batería de Litio 60V/105Ah ",
    price: 8050,
  },
  {
    model: "Quantum E4 con batería de Litio 60V/105Ah ",
    price: 7900,
  },
  {
    model: "Quantum DUKE con batería de Litio 60V/105Ah",
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
    firstPeriodInterest = FIRST_PERIOD_INTEREST,
    secondPeriodInterest = SECOND_PERIOD_INTEREST,
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

    console.log(secondPeriodRows);

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
const $vehiclePriceShow = $("#vehiclePrice");
const $isMarryInput = $("#isMarry");
const $initialDepositInput = $("#initialDeposit");
const $paymentTermInput = $("#paymentTerm");
const $firstPeriodRateShow = $("#firstPeriodRate");
const $secondPeriodRateShow = $("#secondPeriodRate");
const $messageValidation = $("#messageValidation");
const $calculateButton = $("#calculateButton");
const $resultContainer = $("#resultContainer");
const $newCalcButton = $("#newCalcButton");

$firstPeriodRateShow.innerHTML = `${(FIRST_PERIOD_INTEREST * 100).toFixed(
  2
)}% anual fija`;
$secondPeriodRateShow.innerHTML = `${(SECOND_PERIOD_INTEREST * 100).toFixed(
  2
)}% anual fija`;

vehicles.forEach((vehicle) => {
  const option = document.createElement("option");
  option.value = vehicle.price;
  option.text = vehicle.model;
  $vehicleModelInput.appendChild(option);
});

let vehicleModelPrice, initialDeposit, paymentTerm;

$vehiclePriceShow.innerHTML = `$${vehicles[0].price.toFixed(2)}`;
$("#vehicleNameData").innerHTML = vehicles[0].model;
$("#vehiclePriceData").innerHTML = `${vehicles[0].price} USD`;
$("#paymentDeadlineData").innerHTML = "36 meses";

$form.addEventListener("input", calculateInstallments);
$form.addEventListener("submit", submitForm);
$newCalcButton.addEventListener("click", () => {
  $form.classList.remove("hidden");
  $resultContainer.classList.add("hidden");
});

function calculateInstallments() {
  vehicleModelPrice = parseFloat($vehicleModelInput.value);
  initialDeposit = parseFloat($initialDepositInput.value) ?? NaN;
  paymentTerm = parseInt($paymentTermInput.value) * 12;

  $vehiclePriceShow.innerHTML = `$${vehicleModelPrice.toFixed(2)}`;
  $("#vehicleNameData").innerHTML =
    $vehicleModelInput.options[$vehicleModelInput.selectedIndex].text;
  $("#vehiclePriceData").innerHTML = `${vehicleModelPrice} USD`;
  $("#paymentDeadlineData").innerHTML = `${paymentTerm} meses`;

  if (isNaN(vehicleModelPrice) || isNaN(initialDeposit) || isNaN(paymentTerm)) {
    $messageValidation.innerHTML = "Por favor, complete todos los campos.";
    return;
  } else {
    $messageValidation.innerHTML = "";
  }

  const minInitialDeposit = vehicleModelPrice * 0.1;

  if (initialDeposit < minInitialDeposit) {
    $(
      "#initDepositValidation"
    ).innerHTML = `El aporte inicial debe ser al menos el 10% del precio del vehículo <strong>(USD ${minInitialDeposit.toFixed(
      2
    )})</strong>.`;
    $initialDepositInput.style.borderColor = "red";
    return;
  } else if (initialDeposit > vehicleModelPrice) {
    $(
      "#initDepositValidation"
    ).innerHTML = `El aporte inicial no puede ser mayor al precio del vehículo <strong>(USD ${vehicleModelPrice.toFixed(
      2
    )})</strong>.`;
    $initialDepositInput.style.borderColor = "red";
    return;
  } else {
    $initialDepositInput.style.borderColor = "#d1d1d1";
    $("#initDepositValidation").innerHTML = "";
  }

  const principal =
    (vehicleModelPrice - initialDeposit) * ONE_DOLAR_VALUE_IN_BOB;
  const table = new Table(principal, paymentTerm, $isMarryInput.checked);
  const { averageFirstPeriod, averageSecondPeriod } =
    table.averageQuotaPeriods();
  table.displayTable();

  $("#firstPeriodQuota").innerHTML = `${averageFirstPeriod} Bs. ↔ ${(
    averageFirstPeriod / ONE_DOLAR_VALUE_IN_BOB
  ).toFixed(2)} USD`;
  $("#secondPeriodQuota").innerHTML = `${averageSecondPeriod} Bs. ↔ ${(
    averageSecondPeriod / ONE_DOLAR_VALUE_IN_BOB
  ).toFixed(2)} USD`;
}

function submitForm(event) {
  event.preventDefault();

  if (
    isNaN(vehicleModelPrice) ||
    isNaN(initialDeposit) ||
    isNaN(paymentTerm) ||
    initialDeposit < vehicleModelPrice * 0.1 ||
    initialDeposit > vehicleModelPrice
  ) {
    $messageValidation.innerHTML =
      "Por favor, complete correctamente todos los campos antes de continuar.";
    return;
  } else {
    $messageValidation.innerHTML = "";
  }

  $form.classList.add("hidden");
  $resultContainer.classList.remove("hidden");
}
