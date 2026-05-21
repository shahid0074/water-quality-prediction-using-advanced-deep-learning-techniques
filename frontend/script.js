// Chart Instances
let mainChart;
let sparkCharts = {};

// Color palette
const colors = {
    primary: '#10b981',
    primaryBg: 'rgba(16, 185, 129, 0.2)',
    accent: '#059669',
    accentBg: 'rgba(5, 150, 105, 0.2)',
    textMuted: '#647d73',
    gridLine: 'rgba(16, 185, 129, 0.1)'
};

document.addEventListener("DOMContentLoaded", () => {
    initCharts();
    fetchLiveData();

    // Event Listeners
    document.getElementById("parameter-select").addEventListener("change", (e) => {
        updateMainChart(e.target.value);
    });

    const dropzone = document.getElementById("dropzone");
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--primary)";
        dropzone.style.background = "rgba(77, 124, 255, 0.1)";
    });
    
    dropzone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--border-color)";
        dropzone.style.background = "rgba(255, 255, 255, 0.02)";
    });

    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--border-color)";
        dropzone.style.background = "rgba(255, 255, 255, 0.02)";
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    document.getElementById("csvUpload").addEventListener("change", (e) => {
        if(e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add to clicked
            item.classList.add('active');
            
            // Handle view switching
            const targetId = item.id;
            const metrics = document.querySelector('.metrics-grid');
            const charts = document.querySelector('.charts-section');
            const bottom = document.querySelector('.bottom-section');
            const pageHeading = document.getElementById('page-heading');
            
            if (targetId === 'nav-dashboard') {
                metrics.classList.remove('hidden');
                charts.classList.remove('hidden');
                bottom.classList.remove('hidden');
                pageHeading.innerText = "Dashboard Analytics";
            } else if (targetId === 'nav-history') {
                metrics.classList.add('hidden');
                charts.classList.remove('hidden');
                bottom.classList.add('hidden');
                pageHeading.innerText = "Historical Data";
            } else if (targetId === 'nav-predict') {
                metrics.classList.add('hidden');
                charts.classList.remove('hidden');
                bottom.classList.add('hidden');
                pageHeading.innerText = "Deep Learning Predictions";
            } else if (targetId === 'nav-upload') {
                metrics.classList.add('hidden');
                charts.classList.add('hidden');
                bottom.classList.remove('hidden');
                pageHeading.innerText = "Data Upload & Inference";
            }
        });
    });
});

function initCharts() {
    Chart.defaults.color = colors.textMuted;
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Setup Main Chart
    const ctx = document.getElementById('mainPredictionChart').getContext('2d');
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Historical Data',
                    data: [],
                    borderColor: colors.textMuted,
                    backgroundColor: 'rgba(100, 125, 115, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'DL Prediction',
                    data: [],
                    borderColor: colors.accent,
                    backgroundColor: colors.accentBg,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: { boxWidth: 12, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e2f28',
                    bodyColor: '#647d73',
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 4
                }
            },
            scales: {
                x: {
                    grid: { color: colors.gridLine, drawBorder: false }
                },
                y: {
                    grid: { color: colors.gridLine, drawBorder: false }
                }
            }
        }
    });

    // Create empty sparklines
    ['ph', 'do', 'turb', 'temp'].forEach(metric => {
        const sparkCtx = document.getElementById(`spark-${metric}`).getContext('2d');
        sparkCharts[metric] = new Chart(sparkCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: 10}, (_, i) => i),
                datasets: [{
                    data: [],
                    borderColor: colors.primary,
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } },
                layout: { padding: 0 }
            }
        });
    });
}

async function fetchLiveData() {
    // Show Loading
    document.getElementById("chart-loading").classList.add("active");
    
    try {
        // Fetch from the real FastAPI backend
        const res = await fetch("http://127.0.0.1:8000/api/dashboard");
        if (!res.ok) throw new Error("API not accessible");
        const data = await res.json();
        
        updateDashboardUI(data);
        updateMainChart(document.getElementById("parameter-select").value, data.history);
        document.getElementById("chart-loading").classList.remove("active");
        
        // Set backend status to online
        document.querySelector(".dot").classList.add("online");
        document.getElementById("backend-status").innerText = "Model API Online (PyTorch)";
        document.querySelector(".status-badge").classList.add("active");
        document.querySelector(".status-badge").innerText = "Online";

    } catch(err) {
        console.warn("Backend offline, using mock data", err);
        // Fallback Mock API Response for UI Demonstration
        setTimeout(() => {
            const mockData = generateMockData();
            updateDashboardUI(mockData);
            updateMainChart(document.getElementById("parameter-select").value, mockData);
            document.getElementById("chart-loading").classList.remove("active");
            
            // Set backend status to online (Mock)
            document.querySelector(".dot").classList.add("online");
            document.getElementById("backend-status").innerText = "Model API Online (Mock)";
            document.querySelector(".status-badge").classList.add("active");
            document.querySelector(".status-badge").innerText = "Online";
        }, 800);
    }
}

function updateDashboardUI(data) {
    document.getElementById("metric-ph").innerText = data.current.ph.toFixed(2);
    document.getElementById("metric-do").innerHTML = `${data.current.do.toFixed(1)} <span class="unit">mg/L</span>`;
    document.getElementById("metric-turb").innerHTML = `${data.current.turbidity.toFixed(1)} <span class="unit">NTU</span>`;
    document.getElementById("metric-temp").innerHTML = `${data.current.temp.toFixed(1)} <span class="unit">°C</span>`;

    // Update Sparklines
    sparkCharts['ph'].data.datasets[0].data = data.history.ph.slice(-10);
    sparkCharts['ph'].update();
    
    sparkCharts['do'].data.datasets[0].data = data.history.do.slice(-10);
    sparkCharts['do'].update();
    
    sparkCharts['turb'].data.datasets[0].data = data.history.turbidity.slice(-10);
    sparkCharts['turb'].update();
    
    sparkCharts['temp'].data.datasets[0].data = data.history.temp.slice(-10);
    sparkCharts['temp'].update();
}

function updateMainChart(param, globalData = null) {
    const histLen = 15;
    let histData = [];
    
    // Check if we have real historical data from API
    if (globalData && globalData[param]) {
        histData = globalData[param].slice(-histLen);
    } else {
        // Mock fallback
        let baseVal, variance;
        if(param === 'ph') { baseVal = 7; variance = 0.5; }
        else if(param === 'do') { baseVal = 8; variance = 2; }
        else { baseVal = 15; variance = 5; }
        histData = Array.from({length: histLen}, () => baseVal + (Math.random() - 0.5) * variance);
    }
    
    // Predictions check
    let predData = new Array(histLen + 10).fill(null);
    predData[histLen - 1] = histData[histLen - 1]; // connect line
    
    if (globalData && globalData.forecast && globalData.forecast[param]) {
        // Real API Forecast
        const forecastArr = globalData.forecast[param];
        for (let i = 0; i < forecastArr.length; i++) {
            predData[histLen + i] = forecastArr[i];
        }
    } else {
        // Mock Prediction
        let baseVal, variance;
        if(param === 'ph') { baseVal = 7; variance = 0.5; }
        else if(param === 'do') { baseVal = 8; variance = 2; }
        else { baseVal = 15; variance = 5; }
        
        for(let i=histLen; i<histLen+10; i++) {
            predData[i] = predData[i-1] + (Math.random() - 0.5) * (variance * 0.5);
        }
    }

    const labels = Array.from({length: histLen + 10}, (_, i) => i < histLen ? `Hist Day ${i+1}` : `Pred Day ${i-histLen+1}`);

    mainChart.data.labels = labels;
    mainChart.data.datasets[0].data = [...histData, ...new Array(10).fill(null)];
    mainChart.data.datasets[1].data = predData;
    mainChart.update();
}

async function handleFileUpload(file) {
    if(!file.name.endsWith(".csv")) {
        alert("Please upload a valid CSV file.");
        return;
    }
    
    const dropzone = document.getElementById("dropzone");
    dropzone.innerHTML = `<div class="spinner"></div><p style="margin-top:1rem;">Running Deep Learning inference on <strong>${file.name}</strong>...</p>`;
    
    try {
        const formData = new FormData();
        formData.append("file", file);
        
        let data;
        try {
            const res = await fetch("http://127.0.0.1:8000/api/predict", {
                method: "POST",
                body: formData
            });
            
            if (!res.ok) throw new Error("API error");
            data = await res.json();
        } catch(fetchErr) {
            if (fetchErr.message.includes("Failed to fetch") || fetchErr.message.includes("NetworkError")) {
                console.warn("Backend offline, generating mock predictions for file upload", fetchErr);
                // Simulate processing time
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Provide mock forecast data
                data = {
                    status: "success",
                    message: "Signal decomposition and context extraction completed. (Mock Data)",
                    forecast: {
                        ph: Array.from({length: 10}, () => 7.2 + (Math.random() - 0.5) * 0.4),
                        do: Array.from({length: 10}, () => 8.5 + (Math.random() - 0.5) * 1.5),
                        turbidity: Array.from({length: 10}, () => 12.4 + (Math.random() - 0.5) * 3),
                        temp: Array.from({length: 10}, () => 22.1 + (Math.random() - 0.5) * 2)
                    }
                };
            } else {
                throw fetchErr;
            }
        }
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        dropzone.innerHTML = `
            <svg class="icon-large" style="color:var(--positive);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <p style="color:var(--positive); font-weight:600;">Analysis Complete</p>
            <p class="description" style="margin-top:0;">Model generated 10-day forecast.</p>
            <button class="btn btn-outline" onclick="location.reload()">Reset</button>
        `;
        
        // Also update the dashboard using the newly inferred prediction data
        // For simplicity, we assume 'ph' is the currently selected parameter
        const param = document.getElementById("parameter-select").value;
        // In a real app we would combine the uploaded history with the predictions.
        // For demo, we just pass the new forecast to updateMainChart manually if needed.
        
    } catch(err) {
        console.error(err);
        dropzone.innerHTML = `
            <p style="color:var(--negative);">Error processing file: ${err.message}. Ensure it has columns: ph, do, turbidity, temp.</p>
            <button class="btn btn-outline" style="margin-top:1rem;" onclick="location.reload()">Reset</button>
        `;
    }
}

// Generate some random looking cohesive data
function generateMockData() {
    return {
        current: {
            ph: 7.2 + (Math.random() - 0.5) * 0.4,
            do: 8.5 + (Math.random() - 0.5) * 1.5,
            turbidity: 12.4 + (Math.random() - 0.5) * 3,
            temp: 22.1 + (Math.random() - 0.5) * 2
        },
        history: {
            ph: Array.from({length: 10}, () => 7.2 + (Math.random() - 0.5) * 0.4),
            do: Array.from({length: 10}, () => 8.5 + (Math.random() - 0.5) * 1.5),
            turbidity: Array.from({length: 10}, () => 12.4 + (Math.random() - 0.5) * 3),
            temp: Array.from({length: 10}, () => 22.1 + (Math.random() - 0.5) * 2)
        }
    };
}


