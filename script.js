document.addEventListener('DOMContentLoaded', () => {
    let portfolioBalance = 0;
    const dailyGrowthRate = 0.018; // 1.8% dziennie
    const maxDailyGrowthUSD = 18; // Maksymalny wzrost dzienny w dolarach

    const portfolioMainValue = document.getElementById('portfolio-main-value');
    const portfolioChange = document.getElementById('portfolio-change');

    const depositModal = document.getElementById('deposit-modal');
    const openDepositModalBtn = document.getElementById('open-deposit-modal');
    const closeButton = document.querySelector('.modal .close-button');
    const depositAmountInput = document.getElementById('deposit-amount');
    const confirmDepositBtn = document.getElementById('confirm-deposit');
    const depositErrorMessage = document.getElementById('deposit-error-message');
    const clearBalanceBtn = document.getElementById('clear-balance-btn');

    const futureValue100Days = document.getElementById('future-value-100-days');
    const estimatedValue30Days = document.getElementById('estimated-value-30-days');
    const estimatedValueYear = document.getElementById('estimated-value-year');

    const growthMilestonesList = document.getElementById('growth-milestones-list');
    const growthMilestonesEmptyState = document.getElementById('growth-milestones-empty-state');

    let growthChart;

    // ====== ZMIENNE DLA KALKULATORA WALUT =======
    const usdInput = document.getElementById('usd-input');
    const plnOutput = document.getElementById('pln-output');
    const exchangeRateDisplay = document.getElementById('exchange-rate-display');

    // Stały kurs wymiany USD na PLN
    const FIXED_EXCHANGE_RATE = 3.59;
    // ====== KONIEC ZMIENNYCH DLA KALKULATORA WALUT ========

    function getActualDailyGrowth(currentValue) {
        if (currentValue < 0.01) { // Zapobiega wzrostowi od zera
            return 0;
        }
        const percentageGrowth = currentValue * dailyGrowthRate;
        return Math.min(percentageGrowth, maxDailyGrowthUSD);
    }

    function updatePortfolioUI() {
        portfolioMainValue.textContent = `${portfolioBalance.toFixed(2)} USD`;

        updateGrowthChart();
        updateEstimatedValues();
        updateGrowthMilestones();
    }

    function calculateFutureValue(initialValue, days) {
        let currentValue = initialValue;
        if (currentValue <= 0) return 0;

        for (let i = 0; i < days; i++) {
            currentValue += getActualDailyGrowth(currentValue);
        }
        return currentValue;
    }

    function calculateDaysToReachTarget(initialValue, targetValue) {
        if (initialValue <= 0 || targetValue <= initialValue) {
            return 0; // Jeśli już osiągnięto lub nie ma początkowych środków
        }

        let currentValue = initialValue;
        let days = 0;
        const maxDaysLimit = 365 * 5; // Ograniczenie dla uniknięcia nieskończonej pętli
        const maxIterations = 1000000; // Dodatkowe zabezpieczenie

        while (currentValue < targetValue && days < maxDaysLimit && days < maxIterations) {
            currentValue += getActualDailyGrowth(currentValue);
            days++;
        }

        if (currentValue < targetValue) {
            return null; // Nie osiągnie celu w rozsądnym czasie
        }
        return days;
    }

    function updateEstimatedValues() {
        futureValue100Days.textContent = `${calculateFutureValue(portfolioBalance, 100).toFixed(2)} USD`;
        estimatedValue30Days.textContent = `${calculateFutureValue(portfolioBalance, 30).toFixed(2)} USD`;

        const daysTo1000 = calculateDaysToReachTarget(portfolioBalance, 1000);
        if (daysTo1000 !== null) {
            estimatedValueYear.textContent = `${daysTo1000} Dni`;
        } else {
            if (portfolioBalance >= 1000) {
                estimatedValueYear.textContent = `Osiągnięto!`;
            } else {
                estimatedValueYear.textContent = `N/A (Potrzebne więcej środków)`;
            }
        }
    }

    function updateGrowthMilestones() {
        const initialValue = portfolioBalance;
        const milestones = [];

        // Dodajemy kamień milowy dla podwojenia inwestycji
        if (initialValue > 0) {
            milestones.push({
                type: 'multiplier',
                multiplier: 2,
                label: 'Podwój swoją inwestycję',
                target: initialValue * 2
            });
        }

        // ZMODYFIKOWANY KAMIEŃ MILOWY: Osiągnij 500 USD z dopiskiem
        milestones.push({
            type: 'fixed',
            value: 500,
            label: 'Osiągnij 500 USD (Maksymalna wartość dla G1)', // Zmieniony tekst etykiety
            target: 500
        });

        let milestonesHtml = '';

        if (initialValue > 0) {
            milestones.forEach(milestone => {
                let statusText = '';
                let statusClass = 'neutral';
                let iconClass = 'fa-solid fa-hourglass-half'; // Domyślna ikona oczekiwania
                let displayValue = milestone.target.toFixed(2);

                if (initialValue >= milestone.target) {
                    statusText = 'Osiągnięto!';
                    statusClass = 'positive';
                    iconClass = 'fa-solid fa-check-circle'; // Ikona osiągnięcia
                } else {
                    const daysToReach = calculateDaysToReachTarget(initialValue, milestone.target);
                    if (daysToReach !== null) {
                        statusText = `${daysToReach} Dni`;
                        statusClass = 'positive';
                        iconClass = 'fa-solid fa-chart-line'; // Ikona wzrostu
                    } else {
                        statusText = `N/A (Wiele lat)`;
                        statusClass = 'neutral';
                    }
                }

                milestonesHtml += `
                    <div class="follow-item">
                        <div class="follow-crypto-info">
                            <div class="follow-icon"><i class="${iconClass}"></i></div>
                            <div class="follow-details">
                                <span class="follow-name">${milestone.label}</span>
                                <span class="follow-value">Cel: $${displayValue}</span>
                            </div>
                        </div>
                        <div class="change ${statusClass}">
                            ${statusText}
                        </div>
                    </div>
                `;
            });
        }

        growthMilestonesList.innerHTML = milestonesHtml;
        const emptyStateElement = document.getElementById('growth-milestones-empty-state');
        if (emptyStateElement) {
            if (milestonesHtml === '') {
                emptyStateElement.style.display = 'block';
            } else {
                emptyStateElement.style.display = 'none';
            }
        }
    }

    // Funkcja tworząca/aktualizująca wykres wzrostu
    function updateGrowthChart() {
        const startValueForChart = portfolioBalance;
        const targetValueForChart = 1000;
        const maxChartDaysIfTargetNotReached = 365;
        const maxDisplayValueOnChart = targetValueForChart; // Maksymalna wartość wyświetlana na wykresie

        let currentValue = startValueForChart;
        const data = [];
        const labels = [];
        let daysCounter = 0;

        // Jeśli początkowe saldo to 0 lub mniej, wykres jest pusty
        if (startValueForChart <= 0) {
            const ctx = document.getElementById('growthChart').getContext('2d');
            if (growthChart) {
                growthChart.data.labels = [];
                growthChart.data.datasets[0].data = [];
                growthChart.update();
                growthChart.resetZoom();
            } else {
                growthChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Wartość Portfela (USD)',
                            data: [],
                            borderColor: '#a78bff',
                            backgroundColor: 'rgba(167, 139, 255, 0.2)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: { mode: 'index', intersect: false },
                            zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
                        },
                        scales: {
                            x: { display: false, grid: { display: false } },
                            y: {
                                beginAtZero: true,
                                grid: { color: '#3f3f6d' },
                                ticks: { color: '#e0e0e0', callback: function(value) { return '$' + value.toFixed(0); } },
                                suggestedMax: maxDisplayValueOnChart * 1.05
                            }
                        },
                        animation: { duration: 1000, easing: 'easeOutQuart' },
                        interaction: { mode: 'nearest', axis: 'x', intersect: false }
                    }
                });
            }
            return;
        }

        // Zmienna do śledzenia, czy osiągnięto cel 1000 USD
        let targetReachedAndChartShouldStop = false;

        // Generowanie danych
        // Pętla powinna iść co najmniej do maxChartDaysIfTargetNotReached dni, chyba że cel zostanie osiągnięty wcześniej
        for (let i = 0; i < maxChartDaysIfTargetNotReached * 2; i++) { // Duży limit dla pętli, żeby uniknąć nieskończoności
            labels.push(`Dzień ${i + 1}`);

            // Jeśli currentValue już przekroczył maxDisplayValueOnChart (1000), ustaw go na 1000
            if (currentValue > maxDisplayValueOnChart) {
                currentValue = maxDisplayValueOnChart;
            }

            data.push(currentValue);

            // Sprawdź, czy wartość przekroczyła cel 1000 USD
            if (currentValue >= targetValueForChart) {
                targetReachedAndChartShouldStop = true; // Ustaw flagę do zatrzymania wykresu
            }

            // Oblicz następną wartość
            const nextValue = currentValue + getActualDailyGrowth(currentValue);

            // Jeśli następna wartość przekroczy cel, a wykres ma się zakończyć, zakończ pętlę
            // Chcemy pokazać punkt, w którym wartość *przekracza* 1000, ale nie rysować znacznie dalej
            if (nextValue > targetValueForChart && targetReachedAndChartShouldStop) {
                // Jeśli już dodaliśmy wartość równą/przekraczającą 1000 w tej iteracji,
                // i następna wartość też przekroczy, to dodajemy tę jedną "przekroczoną" wartość
                // i przerywamy.
                if (currentValue < targetValueForChart) { // Jeśli aktualna wartość była poniżej celu
                     currentValue = nextValue; // Dodaj faktyczną wartość
                     if (currentValue > maxDisplayValueOnChart) { // Ale jeśli faktyczna wartość znacznie przekroczy, ogranicz ją
                         currentValue = maxDisplayValueOnChart;
                     }
                     data[data.length -1] = currentValue; // Zaktualizuj ostatni punkt
                }
                break; // PRZERWIJ TUTAJ - to jest klucz do ograniczenia horyzontalnego
            } else {
                 currentValue = nextValue;
            }

            // Jeśli nie osiągnięto celu i osiągnięto maksymalną liczbę dni, przerwij
            if (!targetReachedAndChartShouldStop && i >= maxChartDaysIfTargetNotReached - 1) {
                break;
            }
        }


        const ctx = document.getElementById('growthChart').getContext('2d');

        if (growthChart) {
            growthChart.data.labels = labels;
            growthChart.data.datasets[0].data = data;
            growthChart.options.scales.y.suggestedMax = maxDisplayValueOnChart * 1.05;
            growthChart.options.scales.y.beginAtZero = true;
            growthChart.update();
            growthChart.resetZoom();
        } else {
            growthChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Wartość Portfela (USD)',
                        data: data,
                        borderColor: '#a78bff',
                        backgroundColor: 'rgba(167, 139, 255, 0.2)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 8,
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#a78bff',
                        pointHoverBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false,
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: function(context) {
                                    return `Dzień ${context[0].dataIndex + 1}`;
                                },
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const days = context.dataIndex + 1;
                                    return `Wartość: $${value.toFixed(2)} (za ${days} dni)`;
                                }
                            }
                        },
                        zoom: {
                            pan: {
                                enabled: true,
                                mode: 'x',
                                threshold: 10
                            },
                            zoom: {
                                wheel: {
                                    enabled: true,
                                },
                                pinch: {
                                    enabled: true
                                },
                                mode: 'x',
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: false,
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#3f3f6d'
                            },
                            ticks: {
                                color: '#e0e0e0',
                                callback: function(value) {
                                    return '$' + value.toFixed(0);
                                }
                            },
                            suggestedMax: maxDisplayValueOnChart * 1.05
                        }
                    },
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });
        }
    }

    openDepositModalBtn.addEventListener('click', () => {
        depositModal.style.display = 'flex';
        depositErrorMessage.style.display = 'none';
        depositAmountInput.value = '100';
    });

    closeButton.addEventListener('click', () => {
        depositModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == depositModal) {
            depositModal.style.display = 'none';
        }
    });

    confirmDepositBtn.addEventListener('click', () => {
        const amount = parseFloat(depositAmountInput.value);

        if (isNaN(amount) || amount < 100) {
            depositErrorMessage.textContent = 'Minimalna kwota wpłaty to 100 USD.';
            depositErrorMessage.style.display = 'block';
        } else {
            portfolioBalance += amount;
            depositModal.style.display = 'none';
            depositErrorMessage.style.display = 'none';
            updatePortfolioUI();
            alert(`Pomyślnie wpłacono $${amount.toFixed(2)}.`);
        }
    });

    clearBalanceBtn.addEventListener('click', () => {
        const confirmClear = confirm("Czy na pewno chcesz wyczyścić całe saldo swojego portfolio? Tej operacji nie można cofnąć.");
        if (confirmClear) {
            portfolioBalance = 0;
            updatePortfolioUI();
            alert("Saldo Twojego portfolio zostało wyczyszczone.");
        }
    });

    exchangeRateDisplay.textContent = `1 USD = ${FIXED_EXCHANGE_RATE.toFixed(2)} PLN`;

    usdInput.addEventListener('input', convertCurrency);

    convertCurrency();
    updatePortfolioUI();
});

function convertCurrency() {
    const usdValue = parseFloat(usdInput.value);
    if (isNaN(usdValue) || usdValue < 0) {
        plnOutput.textContent = 'N/A';
        return;
    }
    const plnValue = usdValue * FIXED_EXCHANGE_RATE;
    plnOutput.textContent = `${plnValue.toFixed(2)}`;
}
