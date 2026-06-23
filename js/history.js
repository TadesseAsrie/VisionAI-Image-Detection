export const localHistory = {
  /**
   * Appends target data records onto structural client storage banks
   */
  commitEntry(fileObject, detections, executionTime) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const historyLog = this.fetchLedger();
      const record = {
        id: "tx_log_" + Date.now(),
        timestamp: new Date().toISOString(),
        filename: fileObject.name,
        thumbnail: reader.result, // Base64 encoding for localized caching persistence
        processingDuration: executionTime,
        payload: detections.map((d) => ({ class: d.class, score: d.score })),
      };
      historyLog.unshift(record);
      localStorage.setItem(
        "visionai_history_ledger",
        JSON.stringify(historyLog),
      );
      // Dispatch dynamic event updates to notify the UI
      window.dispatchEvent(new CustomEvent("ledger_updated"));
    };
    reader.readAsDataURL(fileObject);
  },

  fetchLedger() {
    const existing = localStorage.getItem("visionai_history_ledger");
    if (!existing) return [];
    try {
      return JSON.parse(existing);
    } catch {
      return [];
    }
  },

  clearAllLogs() {
    localStorage.removeItem("visionai_history_ledger");
    window.dispatchEvent(new CustomEvent("ledger_updated"));
  },

  /**
   * Aggregates history array objects to calculate statistics
   */
  computeAggregations() {
    const list = this.fetchLedger();
    if (list.length === 0) {
      return {
        totalFrames: 0,
        totalObjects: 0,
        topClass: "None",
        precisionMean: 0,
        classDistribution: {},
      };
    }

    let totalObjectsCalculated = 0;
    let cumulativeConfidenceSum = 0;
    const structuralFrequencyMatrix = {};

    list.forEach((entry) => {
      totalObjectsCalculated += entry.payload.length;
      entry.payload.forEach((obj) => {
        cumulativeConfidenceSum += obj.score;
        structuralFrequencyMatrix[obj.class] =
          (structuralFrequencyMatrix[obj.class] || 0) + 1;
      });
    });

    let topClassIdentified = "None";
    let maxFrequencyCeiling = 0;
    for (const [key, val] of Object.entries(structuralFrequencyMatrix)) {
      if (val > maxFrequencyCeiling) {
        maxFrequencyCeiling = val;
        topClassIdentified = key;
      }
    }

    const baselineAccuracy =
      totalObjectsCalculated > 0
        ? ((cumulativeConfidenceSum / totalObjectsCalculated) * 100).toFixed(2)
        : "0.00";

    return {
      totalFrames: list.length,
      totalObjects: totalObjectsCalculated,
      topClass: topClassIdentified,
      precisionMean: baselineAccuracy,
      classDistribution: structuralFrequencyMatrix,
    };
  },
};
