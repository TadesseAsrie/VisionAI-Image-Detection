import { uiManager } from "./ui.js";
import { aiDetector } from "./detector.js";
import { localHistory } from "./history.js";

class ApplicationController {
  constructor() {
    this.config = {
      minConfidence: 0.6,
      maxBoxes: 20,
    };
    this.runtimeState = {
      currentModel: null,
      latestDetections: [],
      activeTargetFile: null,
      processDurationMs: 0,
    };
  }

  async init() {
    // Load configurations from standard system environments
    this.loadSettings();

    // Initialize UI component hooks and navigation nodes
    uiManager.setupNavigation();
    uiManager.setupTheme();
    uiManager.setupDropzones(this.handleFilePipeline.bind(this));
    this.bindSettingsEvents();

    // Refresh structural visual views
    this.syncDashboardMetrics();

    // Soft initialize Core Target AI Engine structures asynchronously
    try {
      this.runtimeState.currentModel = await aiDetector.bootstrapEngine();
      uiManager.updateEngineStatus("ready");
      uiManager.showToast("AI Detection model initialized.", "success");
    } catch (error) {
      uiManager.updateEngineStatus("error");
      uiManager.showToast(
        "Critical exception failure loading neural frameworks.",
        "error",
      );
      console.error(error);
    }
  }

  async handleFilePipeline(file) {
    if (!file) return;
    this.runtimeState.activeTargetFile = file;

    // Render processing interfaces within working context channels
    const imgElement = await uiManager.renderPreviewFrame(file);
    uiManager.toggleAnalysisLoading(true);

    if (!this.runtimeState.currentModel) {
      uiManager.showToast(
        "Engine calculation postponed. Model synchronization incomplete.",
        "error",
      );
      uiManager.toggleAnalysisLoading(false);
      return;
    }

    const startTimestamp = performance.now();
    try {
      // Forward analytical requests towards processing system pipelines
      const entities = await aiDetector.analyzeFrame(
        this.runtimeState.currentModel,
        imgElement,
        this.config.minConfidence,
      );

      this.runtimeState.processDurationMs = Math.round(
        performance.now() - startTimestamp,
      );
      this.runtimeState.latestDetections = entities.slice(
        0,
        this.config.maxBoxes,
      );

      // Draw overlays over dynamic dimensions targets
      uiManager.drawBoundingOverlays(
        imgElement,
        this.runtimeState.latestDetections,
      );

      // Construct visual ledger elements across result layouts
      uiManager.renderAnalysisReportCards(
        this.runtimeState.latestDetections,
        this.runtimeState.processDurationMs,
      );

      // Persist valid processing operations to storage blocks
      if (this.runtimeState.latestDetections.length > 0) {
        localHistory.commitEntry(
          file,
          this.runtimeState.latestDetections,
          this.runtimeState.processDurationMs,
        );
        this.syncDashboardMetrics();
        uiManager.showToast(
          `Analysis compiled. ${this.runtimeState.latestDetections.length} objects identified.`,
          "success",
        );
      } else {
        uiManager.showToast(
          "Analysis completed. No targets identified.",
          "info",
        );
      }
    } catch (err) {
      console.error(err);
      uiManager.showToast(
        "Execution error during bounding matrix compilation.",
        "error",
      );
    } finally {
      uiManager.toggleAnalysisLoading(false);
    }
  }

  loadSettings() {
    const cached = localStorage.getItem("visionai_settings");
    if (cached) {
      try {
        this.config = JSON.parse(cached);
      } catch (e) {
        console.error(
          "Settings verification rejected configuration defaults.",
          e,
        );
      }
    }
    uiManager.hydrateSettingsFields(this.config);
  }

  bindSettingsEvents() {
    document
      .getElementById("save-settings-btn")
      .addEventListener("click", () => {
        const confRangeVal = document.getElementById(
          "setting-min-confidence",
        ).value;
        const maxBoxesVal = document.getElementById("setting-max-boxes").value;

        this.config.minConfidence = parseFloat(confRangeVal) / 100;
        this.config.maxBoxes = parseInt(maxBoxesVal, 10) || 20;

        localStorage.setItem("visionai_settings", JSON.stringify(this.config));
        uiManager.showToast(
          "Engine system settings update committed successfully.",
          "success",
        );
      });
  }

  syncDashboardMetrics() {
    const analytics = localHistory.computeAggregations();
    uiManager.updateMetricDashboards(analytics);
  }
}

export const app = new ApplicationController();
document.addEventListener("DOMContentLoaded", () => app.init());
