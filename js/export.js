export const exportManager = {
  /**
   * Triggers downloads of plain text data payloads
   */
  triggerDownload(payloadStr, formattingMimeType, structuralFilename) {
    const targetBlob = new Blob([payloadStr], { type: formattingMimeType });
    const URLPointer = URL.createObjectURL(targetBlob);
    const auxiliaryDownloadAnchor = document.createElement("a");
    auxiliaryDownloadAnchor.href = URLPointer;
    auxiliaryDownloadAnchor.download = structuralFilename;
    document.body.appendChild(auxiliaryDownloadAnchor);
    auxiliaryDownloadAnchor.click();
    document.body.removeChild(auxiliaryDownloadAnchor);
    URL.revokeObjectURL(URLPointer);
  },

  exportAsJSON(detections, filename) {
    const output = {
      systemIdentifier: "VisionAI Client Module",
      generatedTimestamp: new Date().toISOString(),
      sourceTargetNode: filename,
      detectionsCount: detections.length,
      matches: detections,
    };
    this.triggerDownload(
      JSON.stringify(output, null, 4),
      "application/json",
      `VisionAI-${Date.now()}.json`,
    );
  },

  exportAsTXT(detections, filename) {
    let documentationManifest = `==================================================\n`;
    documentationManifest += ` VISIONAI INSPECTION MANIFEST REPORT\n`;
    documentationManifest += `==================================================\n`;
    documentationManifest += `Timestamp Generated : ${new Date().toISOString()}\n`;
    documentationManifest += `Target Identifier    : ${filename}\n`;
    documentationManifest += `Extracted Targets    : ${detections.length}\n\n`;

    detections.forEach((item, index) => {
      documentationManifest += `[${index + 1}] Category Match: ${item.class}\n`;
      documentationManifest += `    Confidence Mapping Precision: ${(item.score * 100).toFixed(2)}%\n`;
      documentationManifest += `    Spatial Vectors Matrix Map  : [X:${Math.round(item.bbox[0])}, Y:${Math.round(item.bbox[1])}, W:${Math.round(item.bbox[2])}, H:${Math.round(item.bbox[3])}]\n\n`;
    });

    this.triggerDownload(
      documentationManifest,
      "text/plain",
      `VisionAI-${Date.now()}.txt`,
    );
  },

  exportRenderedCanvas(sourceCanvasElement) {
    const contextURI = sourceCanvasElement.toDataURL("image/png");
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = contextURI;
    downloadAnchor.download = `VisionAI-AnalysisFrame-${Date.now()}.png`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  },
};
