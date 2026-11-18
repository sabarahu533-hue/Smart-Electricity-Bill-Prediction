
// ==========================================
// SMARTBILL - PAKISTAN ELECTRICITY BILL SYSTEM
// Residential Tariff Estimate - 2026
// ==========================================

// Load previous prediction history
let predictions = [];

try {
    predictions = JSON.parse(localStorage.getItem("billHistory")) || [];

    if (!Array.isArray(predictions)) {
        predictions = [];
    }
} catch (error) {
    predictions = [];
}

// Residential tariff rates (PKR per unit)
const tariff = {
    lifeline: [
        { max: 50, rate: 3.95, fixed: 0 },
        { max: 100, rate: 7.74, fixed: 0 }
    ],

    protected: [
        { max: 100, rate: 10.54, fixed: 200 },
        { max: 200, rate: 13.01, fixed: 300 }
    ],

    unprotected: [
        { max: 100, rate: 22.44, fixed: 275 },
        { max: 200, rate: 28.91, fixed: 300 },
        { max: 300, rate: 33.10, fixed: 350 },
        { max: 400, rate: 36.46, fixed: 400 },
        { max: 500, rate: 38.95, fixed: 500 },
        { max: 600, rate: 40.22, fixed: 675 },
        { max: 700, rate: 41.85, fixed: 675 },
        { max: Infinity, rate: 47.20, fixed: 675 }
    ]
};

// Format currency
function money(value) {
    return Number(value).toLocaleString("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ==========================================
// BILL PREDICTION
// ==========================================

function predictBill() {

    const unitsInput = document.getElementById("units");
    const result = document.getElementById("result");

    if (!unitsInput || !result) return;

    const units = Number(unitsInput.value);

    const companyElement = document.getElementById("company");
    const categoryElement = document.getElementById("category");
    const loadElement = document.getElementById("load");

    const company = companyElement
        ? companyElement.value
        : "Not selected";

    const category = categoryElement
        ? categoryElement.value
        : "unprotected";

    const load = loadElement
        ? Number(loadElement.value)
        : 2;

    // Validate units
    if (!Number.isFinite(units) || units <= 0 || units > 10000) {
        result.innerHTML =
            "Please enter valid units between 1 and 10,000.";
        return;
    }

    // Validate sanctioned load
    if (!Number.isFinite(load) || load <= 0 || load > 100) {
        result.innerHTML =
            "Please enter a valid sanctioned load.";
        return;
    }

    // Validate category
    if (!tariff[category]) {
        result.innerHTML =
            "Please select a valid consumer category.";
        return;
    }

    if (category === "lifeline" && units > 100) {
        result.innerHTML =
            "Lifeline category is available only up to 100 units.";
        return;
    }

    if (category === "protected" && units > 200) {
        result.innerHTML =
            "Protected category is available only up to 200 units.";
        return;
    }

    let energyCharges = 0;
    let fixedRate = 0;
    let slabName = "";

    // Calculate energy charges
    if (category === "protected") {

        if (units <= 100) {
            energyCharges = units * 10.54;
            fixedRate = 200;
            slabName = "Protected 1–100 Units";
        } else {
            energyCharges =
                (100 * 10.54) +
                ((units - 100) * 13.01);

            fixedRate = 300;
            slabName = "Protected 101–200 Units";
        }

    } else {

        const slab = tariff[category].find(
            item => units <= item.max
        );

        if (!slab) {
            result.innerHTML =
                "Unable to calculate the applicable tariff.";
            return;
        }

        energyCharges = units * slab.rate;
        fixedRate = slab.fixed;

        if (category === "lifeline") {
            slabName = "Lifeline";
        } else {
            slabName = slab.max === Infinity
                ? "Unprotected Above 700 Units"
                : "Unprotected Up to " + slab.max + " Units";
        }
    }

    // Fixed charges
    const fixedCharges = load * fixedRate;

    // Base amount
    const baseBill = energyCharges + fixedCharges;

    // Illustrative GST estimate (not an official tax calculation)
    const gst = baseBill * 0.18;

    // Estimated total
    const estimatedBill = baseBill + gst;

    // Save prediction
    const record = {
        date: new Date().toLocaleDateString(),
        company: company,
        category: category,
        units: units,
        energy: energyCharges,
        fixed: fixedCharges,
        gst: gst,
        bill: estimatedBill
    };

    predictions.unshift(record);

    // Keep latest 100 records
    predictions = predictions.slice(0, 100);

    localStorage.setItem(
        "billHistory",
        JSON.stringify(predictions)
    );

    // Display result
    result.innerHTML = `
        <h3>Estimated Electricity Bill</h3>

        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Units:</strong> ${units} kWh</p>
        <p><strong>Tariff Slab:</strong> ${slabName}</p>
        <p><strong>Sanctioned Load:</strong> ${load} kW</p>

        <hr>

        <p>Energy Charges: Rs. ${money(energyCharges)}</p>
        <p>Fixed Charges: Rs. ${money(fixedCharges)}</p>
        <p>GST (18% illustrative): Rs. ${money(gst)}</p>

        <hr>

        <h2>Total Estimate: Rs. ${money(estimatedBill)}</h2>

        <p class="note">
            This is an educational estimate.
            Actual electricity bills may include FCA, QTA,
            electricity duty, other taxes, arrears and adjustments.
            The GST calculation shown here is illustrative only.
        </p>
    `;

    updateDashboard();
    updateHistory();
}

// ==========================================
// DASHBOARD
// ==========================================

function updateDashboard() {

    const unitsElement = document.getElementById("totalUnits");
    const billElement = document.getElementById("totalBill");
    const countElement = document.getElementById("totalPredictions");

    const totalUnits = predictions.reduce(
        (sum, item) => sum + Number(item.units || 0),
        0
    );

    const totalBill = predictions.reduce(
        (sum, item) => sum + Number(item.bill || 0),
        0
    );

    if (unitsElement) {
        unitsElement.innerText =
            totalUnits.toLocaleString("en-PK");
    }

    if (billElement) {
        billElement.innerText =
            "Rs. " + money(totalBill);
    }

    if (countElement) {
        countElement.innerText = predictions.length;
    }
}

// ==========================================
// HISTORY
// ==========================================

function updateHistory() {

    const table = document.getElementById("historyTable");

    if (!table) return;

    if (predictions.length === 0) {
        table.innerHTML =
            '<tr><td colspan="3">No predictions yet.</td></tr>';
        return;
    }

    table.innerHTML = predictions.map(item => `
        <tr>
            <td>${item.date || ""}</td>
            <td>${Number(item.units || 0).toLocaleString("en-PK")}</td>
            <td>Rs. ${money(item.bill || 0)}</td>
        </tr>
    `).join("");
}

// Update dashboard and history on page load
updateDashboard();
updateHistory();

// ==========================================
// ELECTRICITY USAGE CHART
// ==========================================

const chartCanvas = document.getElementById("usageChart");

if (chartCanvas && typeof Chart !== "undefined") {

    new Chart(chartCanvas, {
        type: "bar",

        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],

            datasets: [{
                label: "Electricity Units",

                data: [120, 180, 150, 220, 190, 250],

                backgroundColor: "#2685e5",

                borderRadius: 8
            }]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    display: true
                }
            },

            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
