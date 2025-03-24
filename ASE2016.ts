// src/app/algorithms/ase2016/ASE2016.ts
import {
  Algorithm
} from "../../../types/algorithm";

const ase2016Algorithm: Algorithm = {
  id: "ase2016",
  name: "ASE/EACVI Diastolic Function (2016)",
  description:
    "Recommendations for the Evaluation of Left Ventricular Diastolic Function by Echocardiography",
  citation: {
    authors: "Nagueh, S., Smiseth, O., Appleton, C. et al.",
    title:
      "Recommendations for the Evaluation of Left Ventricular Diastolic Function by Echocardiography: An Update from the American Society of Echocardiography and the European Association of Cardiovascular Imaging",
    journal:
      "Journal of the American Society of Echocardiography, 29(4), 277–314. (2016)",
    url: "https://pubmed.ncbi.nlm.nih.gov/27037982/",
  },
  modes: [
    {
      id: "integrated",
      name: "ASE 2016 Integrated Assessment",
      description: "Complete assessment starting with LVEF evaluation",
      startNodeId: "initialAssessment",
    },
  ],
  startNodeId: "initialAssessment",
  nodes: {
    // Initial assessment node - INPUT NODE
    initialAssessment: {
      id: "initialAssessment",
      type: "input",
      question: "What is the left ventricular ejection fraction (LVEF)?",
      options: [
        {
          value: "normal",
          text: "Normal LVEF (≥50%) without myocardial disease",
        },
        {
          value: "normal_with_disease",
          text: "Normal LVEF with myocardial disease (ischemia, LVH, CMP)",
        },
        { value: "reduced", text: "Reduced LVEF (<50%)" },
      ],
      nextNodes: {
        normal: "normalPath_EeRatio",
        reduced: "reducedPath_MitralInflow",
        normal_with_disease: "reducedPath_MitralInflow",
      },
    },

    // === NORMAL PATH NODES (LVEF ≥50% without myocardial disease) ===

    // Input nodes for normal path
    normalPath_EeRatio: {
      id: "normalPath_EeRatio",
      type: "input",
      question: "What is the average E/e' ratio?",
      options: [
        { value: "positive", text: "> 14" },
        { value: "negative", text: "≤ 14" },
        {
          value: "positive_septal",
          text: "Septal E/e' > 15 (only septal available)",
        },
        {
          value: "positive_lateral",
          text: "Lateral E/e' > 13 (only lateral available)",
        },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: { "*": "normalPath_EPrime" },
    },

    normalPath_EPrime: {
      id: "normalPath_EPrime",
      type: "input",
      question: "What are the e' velocities?",
      options: [
        { value: "negative", text: "Septal ≥ 7 AND Lateral ≥ 10 cm/s" },
        { value: "positive", text: "Septal < 7 OR Lateral < 10 cm/s" },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: { "*": "normalPath_TRVelocity" },
    },

    normalPath_TRVelocity: {
      id: "normalPath_TRVelocity",
      type: "input",
      question: "What is the TR Velocity?",
      options: [
        { value: "positive", text: ">2.8 m/s" },
        { value: "negative", text: "≤ 2.8 m/s" },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: { "*": "normalPath_LAVolume" },
    },

    normalPath_LAVolume: {
      id: "normalPath_LAVolume",
      type: "input",
      question: "What is the indexed LA Volume?",
      options: [
        { value: "positive", text: ">34 ml/m²" },
        { value: "negative", text: "≤ 34 ml/m²" },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: { "*": "normalPath_Evaluate" },
    },

    // Logic node for normal path - EVALUATOR NODE
    normalPath_Evaluate: {
      id: "normalPath_Evaluate",
      type: "logic",
      evaluate: (answers: Record<string, string>) => {
        // Count positive/negative criteria
        let positives = 0;
        let negatives = 0;
        let unavailables = 0;

        // Evaluate E/e' ratio including special cases for septal/lateral only
        if (
          answers["normalPath_EeRatio"] === "positive" ||
          answers["normalPath_EeRatio"] === "positive_septal" ||
          answers["normalPath_EeRatio"] === "positive_lateral"
        ) {
          positives++;
        } else if (answers["normalPath_EeRatio"] === "negative") {
          negatives++;
        } else if (answers["normalPath_EeRatio"] === "unavailable") {
          unavailables++;
        }

        // Evaluate e' velocities
        if (answers["normalPath_EPrime"] === "positive") {
          positives++;
        } else if (answers["normalPath_EPrime"] === "negative") {
          negatives++;
        } else if (answers["normalPath_EPrime"] === "unavailable") {
          unavailables++;
        }

        // Evaluate TR velocity
        if (answers["normalPath_TRVelocity"] === "positive") {
          positives++;
        } else if (answers["normalPath_TRVelocity"] === "negative") {
          negatives++;
        } else if (answers["normalPath_TRVelocity"] === "unavailable") {
          unavailables++;
        }

        // Evaluate LA volume
        if (answers["normalPath_LAVolume"] === "positive") {
          positives++;
        } else if (answers["normalPath_LAVolume"] === "negative") {
          negatives++;
        } else if (answers["normalPath_LAVolume"] === "unavailable") {
          unavailables++;
        }

        // Calculate available parameters
        const availableParams = 4 - unavailables;

        // Decision logic
        if (negatives > availableParams / 2) {
          return "resultNormal";
        } else if (positives > availableParams / 2) {
          // If more positives, transition to the reduced path but start with mitral inflow
          return "reducedPath_MitralInflow";
        } else {
          return "resultIndeterminate";
        }
      },
    },

    // === REDUCED/DYSFUNCTION PATH NODES (LVEF <50% OR myocardial disease) ===

    // Input node for reduced/dysfunction path
    reducedPath_MitralInflow: {
      id: "reducedPath_MitralInflow",
      type: "input",
      question: "What is the Mitral Inflow Pattern (E/A ratio)?",
      options: [
        { value: "gte2", text: "E/A ≥ 2" },
        { value: "mid_range", text: "E/A between 0.8 and 1.99" },
        { value: "lt08_high_e", text: "E/A ≤ 0.8 AND E > 50 cm/s" },
        { value: "lt08_low_e", text: "E/A ≤ 0.8 AND E ≤ 50 cm/s" },
      ],
      nextNodes: {
        gte2: "resultGrade3",
        lt08_low_e: "resultGrade1",
        lt08_high_e: "reducedPath_CheckParameterAvailability",
        mid_range: "reducedPath_CheckParameterAvailability",
      },
    },

    // Logic node to check if we need to ask for parameters or use existing ones
    reducedPath_CheckParameterAvailability: {
      id: "reducedPath_CheckParameterAvailability",
      type: "logic",
      evaluate: (answers: Record<string, string>) => {
        // Check if we already have answers from normal path
        const hasEeRatio =
          answers["normalPath_EeRatio"] !== undefined &&
          answers["normalPath_EeRatio"] !== "unavailable";

        const hasTRVelocity =
          answers["normalPath_TRVelocity"] !== undefined &&
          answers["normalPath_TRVelocity"] !== "unavailable";

        const hasLAVolume =
          answers["normalPath_LAVolume"] !== undefined &&
          answers["normalPath_LAVolume"] !== "unavailable";

        // If we have all parameters, we can skip to evaluation
        if (hasEeRatio && hasTRVelocity && hasLAVolume) {
          return "reducedPath_Evaluate";
        }

        // Otherwise, ask for missing parameters
        if (!hasEeRatio) {
          return "reducedPath_EeRatio";
        } else if (!hasTRVelocity) {
          return "reducedPath_TRVelocity";
        } else if (!hasLAVolume) {
          return "reducedPath_LAVolume";
        } else {
          // Shouldn't reach here, but fallback
          return "reducedPath_Evaluate";
        }
      },
    },

    // Additional input nodes for missing parameters
    reducedPath_EeRatio: {
      id: "reducedPath_EeRatio",
      type: "input",
      question: "What is the average E/e' ratio?",
      options: [
        { value: "positive", text: "> 14" },
        {
          value: "positive_septal",
          text: "Septal E/e' > 15 (only septal available)",
        },
        {
          value: "positive_lateral",
          text: "Lateral E/e' > 13 (only lateral available)",
        },
        {
          value: "negative",
          text: "≤ 14 (or below septal/lateral thresholds)",
        },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: {
        "*": "reducedPath_CheckTRAvailability",
      },
    },

    // Logic node to check TR availability
    reducedPath_CheckTRAvailability: {
      id: "reducedPath_CheckTRAvailability",
      type: "logic",
      evaluate: (answers: Record<string, string>) => {
        const hasTRVelocity =
          answers["normalPath_TRVelocity"] !== undefined &&
          answers["normalPath_TRVelocity"] !== "unavailable";

        if (hasTRVelocity) {
          return "reducedPath_CheckLAAvailability";
        } else {
          return "reducedPath_TRVelocity";
        }
      },
    },

    reducedPath_TRVelocity: {
      id: "reducedPath_TRVelocity",
      type: "input",
      question: "What is the TR Velocity?",
      options: [
        { value: "positive", text: "> 2.8 m/s" },
        { value: "negative", text: "≤ 2.8 m/s" },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: {
        "*": "reducedPath_CheckLAAvailability",
      },
    },

    // Logic node to check LA availability
    reducedPath_CheckLAAvailability: {
      id: "reducedPath_CheckLAAvailability",
      type: "logic",
      evaluate: (answers: Record<string, string>) => {
        const hasLAVolume =
          answers["normalPath_LAVolume"] !== undefined &&
          answers["normalPath_LAVolume"] !== "unavailable";

        if (hasLAVolume) {
          return "reducedPath_CheckPVFlowNeed";
        } else {
          return "reducedPath_LAVolume";
        }
      },
    },

    reducedPath_LAVolume: {
      id: "reducedPath_LAVolume",
      type: "input",
      question: "What is the indexed LA Volume?",
      options: [
        { value: "positive", text: "> 34 ml/m²" },
        { value: "negative", text: "≤ 34 ml/m²" },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: {
        "*": "reducedPath_CheckPVFlowNeed",
      },
    },

    // Logic node to check if PV flow assessment is needed
    reducedPath_CheckPVFlowNeed: {
      id: "reducedPath_CheckPVFlowNeed",
      type: "logic",
      evaluate: (answers: Record<string, string>) => {
        // Determine which E/e' result to use
        const eeRatio =
          answers["reducedPath_EeRatio"] || answers["normalPath_EeRatio"];
        const trVelocity =
          answers["reducedPath_TRVelocity"] || answers["normalPath_TRVelocity"];
        const laVolume =
          answers["reducedPath_LAVolume"] || answers["normalPath_LAVolume"];

        // Check if any parameter is unavailable
        const hasUnavailable =
          eeRatio === "unavailable" ||
          trVelocity === "unavailable" ||
          laVolume === "unavailable";

        // Only ask for PV flow if:
        // 1. User came directly from reduced LVEF path (not from normal path)
        // 2. AND at least one parameter is unavailable
        const isReducedEF = answers["initialAssessment"] === "reduced";

        if (hasUnavailable && isReducedEF) {
          return "reducedPath_PVFlow";
        } else {
          return "reducedPath_Evaluate";
        }
      },
    },

    reducedPath_PVFlow: {
      id: "reducedPath_PVFlow",
      type: "input",
      question: "What is the pulmonary vein S/D ratio?",
      options: [
        { value: "negative", text: "≥ 1" },
        { value: "positive", text: "< 1" },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: {
        "*": "reducedPath_Evaluate",
      },
    },

    // Logic node for final evaluation
    reducedPath_Evaluate: {
      id: "reducedPath_Evaluate",
      type: "logic",
      evaluate: (answers: Record<string, string>) => {
        // Determine which results to use - prefer dysfunction path if available
        const mitralInflow = answers["reducedPath_MitralInflow"];
        const eeRatio =
          answers["reducedPath_EeRatio"] ||
          answers["normalPath_EeRatio"] ||
          "unavailable";
        const trVelocity =
          answers["reducedPath_TRVelocity"] ||
          answers["normalPath_TRVelocity"] ||
          "unavailable";
        const laVolume =
          answers["reducedPath_LAVolume"] ||
          answers["normalPath_LAVolume"] ||
          "unavailable";
        const pvFlow = answers["reducedPath_PVFlow"] || "unavailable";

        // For certain mitral inflow patterns, grade is determined directly
        if (mitralInflow === "gte2") {
          return "resultGrade3";
        } else if (mitralInflow === "lt08_low_e") {
          return "resultGrade1";
        }

        // For mid-range E/A or E/A ≤ 0.8 with E > 50 cm/s, we need to evaluate other criteria

        // Count positive and negative results
        let positives = 0;
        let negatives = 0;
        let availables = 0;

        // Evaluate each parameter
        if (eeRatio !== "unavailable") {
          availables++;
          if (
            eeRatio === "positive" ||
            eeRatio === "positive_septal" ||
            eeRatio === "positive_lateral"
          ) {
            positives++;
          } else {
            negatives++;
          }
        }

        if (trVelocity !== "unavailable") {
          availables++;
          if (trVelocity === "positive") {
            positives++;
          } else {
            negatives++;
          }
        }

        if (laVolume !== "unavailable") {
          availables++;
          if (laVolume === "positive") {
            positives++;
          } else {
            negatives++;
          }
        }

        // Include PV flow if available
        if (pvFlow !== "unavailable") {
          availables++;
          if (pvFlow === "positive") {
            positives++;
          } else {
            negatives++;
          }
        }

        // Make decision based on available data
        if (availables >= 3) {
          if (positives >= 2) {
            return "resultGrade2";
          } else if (negatives >= 2) {
            return "resultGrade1";
          } else {
            return "resultIndeterminate";
          }
        } else if (availables === 2) {
          if (positives === 2) {
            return "resultGrade2";
          } else if (negatives === 2) {
            return "resultGrade1";
          } else {
            return "resultIndeterminate";
          }
        } else {
          return "resultInsufficientInfo";
        }
      },
    },

    // === RESULT NODES ===
    resultNormal: {
      id: "resultNormal",
      type: "result",
      resultKey: "normal",
    },
    resultGrade1: {
      id: "resultGrade1",
      type: "result",
      resultKey: "grade-1",
    },
    resultGrade2: {
      id: "resultGrade2",
      type: "result",
      resultKey: "grade-2",
    },
    resultGrade3: {
      id: "resultGrade3",
      type: "result",
      resultKey: "grade-3",
    },
    resultIndeterminate: {
      id: "resultIndeterminate",
      type: "result",
      resultKey: "indeterminate",
    },
    resultInsufficientInfo: {
      id: "resultInsufficientInfo",
      type: "result",
      resultKey: "insufficient_info",
    },
  },
};

export default ase2016Algorithm;
