import { aiDetector } from "./detector.js";
import { exportManager } from "./export.js";
import { localHistory } from "./history.js";

class UIManager {
  constructor() {
    this.currentActivePageId = "dashboard-page";
  }

  setupNavigation() {
    const buttons = document.querySelectorAll(".nav-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        this.switchPageView(target);
      });
    });

    // Dashboard Call-To-Action mapping
    document
      .querySelectorAll('[data-action="go-detect"]')
      .forEach((element) => {
        element.addEventListener("click", () =>
          this.switchPageView("detection-page"),
        );
      });

    // Mobile Sidebar toggler implementation
    const toggleBtn = document.getElementById("sidebar-toggle");
    const sidebar = document.querySelector(".sidebar");
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener("click", () =>
        sidebar.classList.toggle("open"),
      );
      // Close mobile menu when page views shift
      buttons.forEach((b) =>
        b.addEventListener("click", () => sidebar.classList.remove("open")),
      );
    }

    // Setup historical filter listeners
    document
      .getElementById("history-search-input")
      .addEventListener("input", () => this.renderHistoryTable());
    document
      .getElementById("history-sort-select")
      .addEventListener("change", () => this.renderHistoryTable());
    document
      .getElementById("clear-history-btn")
      .addEventListener("click", () => {
        if (confirm("Confirm permanent cache clear of historical entries?")) {
          localHistory.clearAllLogs();
          this.showToast("Historical ledger purged completely.", "info");
        }
      });

    window.addEventListener("ledger_updated", () => {
      this.renderHistoryTable();
      this.updateStatisticsLayout();
    });
  }

  switchPageView(pageId) {
    document
      .querySelectorAll(".page-view")
      .forEach((p) => p.classList.remove("active"));
    document
      .querySelectorAll(".nav-btn")
      .forEach((b) => b.classList.remove("active"));

    const matchPage = document.getElementById(pageId);
    if (matchPage) matchPage.classList.add("active");

    const matchBtn = document.querySelector(`[data-target="${pageId}"]`);
    if (matchBtn) matchBtn.classList.add("active");

    this.currentActivePageId = pageId;

    // Lazy lifecycle trigger adjustments
    if (pageId === "history-page") this.renderHistoryTable();
    if (pageId === "statistics-page") this.updateStatisticsLayout();
  }

  setupTheme() {
    const themeBtn = document.getElementById("theme-toggle");
    themeBtn.addEventListener("click", () => {
      const htmlNode = document.documentElement;
      const currentTheme = htmlNode.getAttribute("data-theme");
      const targetTheme = currentTheme === "dark" ? "light" : "dark";
      htmlNode.setAttribute("data-theme", targetTheme);

      const dynamicIcon = themeBtn.querySelector("i");
      if (targetTheme === "light") {
        dynamicIcon.className = "fa-solid fa-sun";
      } else {
        dynamicIcon.className = "fa-solid fa-moon";
      }
    });
  }

  setupDropzones(fileCallbackDispatcher) {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");

    ["dragenter", "dragover"].forEach((name) => {
      dropZone.addEventListener(
        name,
        (e) => {
          e.preventDefault();
          dropZone.classList.add("dragover");
        },
        false,
      );
    });
    ["dragleave", "drop"].forEach((name) => {
      dropZone.addEventListener(
        name,
        (e) => {
          e.preventDefault();
          dropZone.classList.remove("dragover");
        },
        false,
      );
    });

    dropZone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      fileCallbackDispatcher(file);
    });
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      fileCallbackDispatcher(file);
    });

    document
      .getElementById("clear-upload-btn")
      .addEventListener("click", () => {
        document.getElementById("preview-wrapper").classList.add("hidden");
        dropZone.classList.remove("hidden");
        fileInput.value = "";
        this.toggleResultsPlaceholder(true);
      });
  }

  hydrateSettingsFields(configObj) {
    document.getElementById("setting-min-confidence").value = Math.round(
      configObj.minConfidence * 100,
    );
    document.getElementById("confidence-range-val").innerText =
      `${Math.round(configObj.minConfidence * 100)}%`;
    document.getElementById("setting-max-boxes").value = configObj.maxBoxes;

    document
      .getElementById("setting-min-confidence")
      .addEventListener("input", (e) => {
        document.getElementById("confidence-range-val").innerText =
          `${e.target.value}%`;
      });
  }

  updateEngineStatus(status) {
    const badge = document.getElementById("model-status-badge");
    if (status === "ready") {
      badge.className = "badge badge-success";
      badge.innerHTML = `<i class="fa-solid fa-check-double"></i> Engine: Active`;
    } else if (status === "error") {
      badge.className = "badge badge-danger";
      badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Engine: Faulted`;
    }
  }

  showToast(message, variant = "info") {
    const container = document.getElementById("notification-container");
    const toast = document.createElement("div");
    toast.className = `toast ${variant}`;

    let iconMarkup = '<i class="fa-solid fa-info-circle"></i>';
    if (variant === "success")
      iconMarkup = '<i class="fa-solid fa-circle-check"></i>';
    if (variant === "error")
      iconMarkup = '<i class="fa-solid fa-triangle-exclamation"></i>';

    toast.innerHTML = `${iconMarkup} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  renderPreviewFrame(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const imageNode = document.getElementById("source-preview-image");

      reader.onload = (e) => {
        imageNode.src = e.target.result;
        imageNode.onload = () => {
          document.getElementById("drop-zone").classList.add("hidden");
          document.getElementById("preview-wrapper").classList.remove("hidden");
          resolve(imageNode);
        };
      };
      reader.readAsDataURL(file);
    });
  }

  toggleAnalysisLoading(showLoader) {
    const loader = document.getElementById("detection-loader");
    const emptyMsg = document.getElementById("empty-results-msg");
    if (showLoader) {
      loader.classList.remove("hidden");
      emptyMsg.classList.add("hidden");
      this.toggleResultsPlaceholder(false);
    } else {
      loader.classList.add("hidden");
    }
  }

  toggleResultsPlaceholder(showPlaceholder) {
    if (showPlaceholder) {
      document.getElementById("empty-results-msg").classList.remove("hidden");
      document.getElementById("results-meta-data").classList.add("hidden");
      document.getElementById("results-cards-container").innerHTML = "";
      document.getElementById("export-actions-wrapper").classList.add("hidden");

      const canvas = document.getElementById("detection-overlay-canvas");
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      document.getElementById("results-meta-data").classList.remove("hidden");
      document
        .getElementById("export-actions-wrapper")
        .classList.remove("hidden");
    }
  }

  drawBoundingOverlays(imgElement, detections) {
    const canvas = document.getElementById("detection-overlay-canvas");
    const ctx = canvas.getContext("2d");

    // Establish operational scaling vectors between intrinsic graphic files and runtime DOM node layers
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox;
      const targetColor = aiDetector.assignHexPalette(prediction.class);

      // Configure dynamic stroke properties
      ctx.strokeStyle = targetColor;
      ctx.lineWidth = Math.max(2, Math.round(canvas.width / 300));
      ctx.fillStyle = targetColor;

      // Render object bounding structures
      ctx.strokeRect(x, y, width, height);

      // Construct label layouts dynamically
      const tagString = `${prediction.class} ${(prediction.score * 100).toFixed(0)}%`;
      const fontUnits = Math.max(12, Math.round(canvas.width / 50));
      ctx.font = `600 ${fontUnits}px sans-serif`;

      const trackingMetrics = ctx.measureText(tagString);
      const blockHeight = fontUnits + 8;

      ctx.fillRect(
        x,
        y - blockHeight < 0 ? y : y - blockHeight,
        trackingMetrics.width + 12,
        blockHeight,
      );

      ctx.fillStyle = "#ffffff";
      ctx.fillText(
        tagString,
        x + 6,
        y - blockHeight < 0 ? y + fontUnits : y - blockHeight + fontUnits,
      );
    });

    // Set up action triggers for the current operational frame state context
    this.bindExportActionEvents(detections, imgElement);
  }

  renderAnalysisReportCards(detections, runningDuration) {
    document.getElementById("res-meta-count").innerText = detections.length;
    document.getElementById("res-meta-time").innerText = `${runningDuration}ms`;

    const cardStack = document.getElementById("results-cards-container");
    cardStack.innerHTML = "";

    detections.forEach((item) => {
      const panelColor = aiDetector.assignHexPalette(item.class);
      const elementRow = document.createElement("div");
      elementRow.className = "detection-item-card";
      elementRow.innerHTML = `
                <div class="identity">
                    <span class="color-indicator" style="background-color: ${panelColor}"></span>
                    <span>${item.class}</span>
                </div>
                <div class="accuracy-score"><strong>${(item.score * 100).toFixed(1)}%</strong></div>
            `;
      cardStack.appendChild(elementRow);
    });
  }

  bindExportActionEvents(detections, originalImg) {
    // Clear old structural reference mutations by cloning execution nodes
    ["export-json-btn", "export-txt-btn", "export-img-btn"].forEach((id) => {
      const oldNode = document.getElementById(id);
      const newNode = oldNode.cloneNode(true);
      oldNode.parentNode.replaceChild(newNode, oldNode);
    });

    const targetFilename =
      document.getElementById("file-input").files[0]?.name || "InspectionFrame";

    document.getElementById("export-json-btn").addEventListener("click", () => {
      exportManager.exportAsJSON(detections, targetFilename);
    });
    document.getElementById("export-txt-btn").addEventListener("click", () => {
      exportManager.exportAsTXT(detections, targetFilename);
    });
    document.getElementById("export-img-btn").addEventListener("click", () => {
      // Generate canvas configuration composite file downloads
      const exportCanvas = document.createElement("canvas");
      const expCtx = exportCanvas.getContext("2d");
      exportCanvas.width = originalImg.naturalWidth;
      exportCanvas.height = originalImg.naturalHeight;

      expCtx.drawImage(originalImg, 0, 0);
      expCtx.drawImage(
        document.getElementById("detection-overlay-canvas"),
        0,
        0,
      );

      exportManager.exportRenderedCanvas(exportCanvas);
    });
  }

  updateMetricDashboards(metrics) {
    document.getElementById("dash-total-images").innerText =
      metrics.totalFrames;
    document.getElementById("dash-total-objects").innerText =
      metrics.totalObjects;
    document.getElementById("dash-top-object").innerText = metrics.topClass;
  }

  renderHistoryTable() {
    const data = localHistory.fetchLedger();
    const searchVal = document
      .getElementById("history-search-input")
      .value.toLowerCase();
    const sortStrategy = document.getElementById("history-sort-select").value;
    const body = document.getElementById("history-table-body");

    body.innerHTML = "";

    let processingCollection = data.filter((entry) => {
      if (!searchVal) return true;
      return entry.payload.some((obj) =>
        obj.class.toLowerCase().includes(searchVal),
      );
    });

    // Apply selected structural sort matrices
    processingCollection.sort((a, b) => {
      if (sortStrategy === "date-desc")
        return new Date(b.timestamp) - new Date(a.timestamp);
      if (sortStrategy === "date-asc")
        return new Date(a.timestamp) - new Date(b.timestamp);
      if (sortStrategy === "conf-desc") {
        const maxA = Math.max(...a.payload.map((p) => p.score), 0);
        const maxB = Math.max(...b.payload.map((p) => p.score), 0);
        return maxB - maxA;
      }
      return 0;
    });

    if (processingCollection.length === 0) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No logs match search criteria.</td></tr>`;
      return;
    }

    processingCollection.forEach((row) => {
      const tr = document.createElement("tr");
      const totalConfidenceSum = row.payload.reduce(
        (acc, current) => acc + current.score,
        0,
      );
      const localizedMean = (
        (totalConfidenceSum / row.payload.length) *
        100
      ).toFixed(1);

      // Format unique display names safely
      const dynamicCategoriesList = [
        ...new Set(row.payload.map((p) => p.class)),
      ].join(", ");

      tr.innerHTML = `
                <td><img src="${row.thumbnail}" class="history-thumb" alt="Thumbnail instance token"></td>
                <td><strong>${new Date(row.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong><br><small style="color:var(--text-muted)">${new Date(row.timestamp).toLocaleDateString()}</small></td>
                <td><span class="badge badge-success">${row.payload.length} Objects</span></td>
                <td><span style="font-size:0.85rem; display:block; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${dynamicCategoriesList}</span><small style="color:var(--text-muted)">Mean Accuracy: ${localizedMean}%</small></td>
                <td><button class="btn btn-action btn-sm load-historical-frame-btn" data-id="${row.id}"><i class="fa-solid fa-folder-open"></i> Load</button></td>
            `;

      tr.querySelector(".load-historical-frame-btn").addEventListener(
        "click",
        () => {
          this.loadHistoricalItemToWorkspace(row);
        },
      );

      body.appendChild(tr);
    });
  }

  loadHistoricalItemToWorkspace(ledgerRow) {
    this.switchPageView("detection-page");
    this.toggleResultsPlaceholder(false);

    const previewImage = document.getElementById("source-preview-image");
    previewImage.src = ledgerRow.thumbnail;

    previewImage.onload = () => {
      document.getElementById("drop-zone").classList.add("hidden");
      document.getElementById("preview-wrapper").classList.remove("hidden");

      // Re-map localized items array payloads
      const structuredDetections = ledgerRow.payload.map((p) => ({
        class: p.class,
        score: p.score,
        // Generate relative mock fallback box coordinates if bounding maps were flattened during translation
        bbox: [
          previewImage.naturalWidth * 0.15,
          previewImage.naturalHeight * 0.15,
          previewImage.naturalWidth * 0.6,
          previewImage.naturalHeight * 0.6,
        ],
      }));

      this.drawBoundingOverlays(previewImage, structuredDetections);
      this.renderAnalysisReportCards(
        structuredDetections,
        ledgerRow.processingDuration,
      );
      this.showToast(
        "Historical snapshot loaded into workspace environment.",
        "success",
      );
    };
  }

  updateStatisticsLayout() {
    const dataset = localHistory.computeAggregations();

    document.getElementById("stats-avg-accuracy").innerText =
      `${dataset.precisionMean}%`;
    document.getElementById("accuracy-progress").style.width =
      `${dataset.precisionMean}%`;
    document.getElementById("stats-total-images").innerText =
      `${dataset.totalFrames} Frames`;

    const distributionContainer = document.getElementById(
      "stats-distribution-container",
    );
    distributionContainer.innerHTML = "";

    if (Object.keys(dataset.classDistribution).length === 0) {
      distributionContainer.innerHTML = `<p style="color:var(--text-muted); text-align:center;">No tracking instances recorded.</p>`;
      return;
    }

    // Sort items dynamically by frequency counts
    const sortedCollection = Object.entries(dataset.classDistribution).sort(
      (a, b) => b[1] - a[1],
    );
    const maxInstancesFound = sortedCollection[0][1];

    sortedCollection.forEach(([label, counts]) => {
      const comparativePercentage = (
        (counts / maxInstancesFound) *
        100
      ).toFixed(0);
      const rowPanel = document.createElement("div");
      rowPanel.style.margin = "14px 0";
      rowPanel.innerHTML = `
                <div style="display:flex; justify-content:between; font-size:0.85rem; margin-bottom:4px;">
                    <strong>${label}</strong>
                    <span style="margin-left:auto; color:var(--text-muted);">${counts} instances</span>
                </div>
                <div style="background:rgba(0,0,0,0.2); height:6px; border-radius:3px;">
                    <div style="background:var(--color-primary); width:${comparativePercentage}%; height:100%; border-radius:3px;"></div>
                </div>
            `;
      distributionContainer.appendChild(rowPanel);
    });
  }
}

export const uiManager = new UIManager();
