// src/app/algorithms/mayo2025/Mayo2025.ts
import {Algorithm} from "../../../types/algorithm";

const mayo2025Algorithm: Algorithm = {
  id: "mayo2025",
  name: "Young et al. Diastolic Function (2025)",
  description: "From the Mayo Clinic",
  citation: {
    authors: "Young, Kathleen A. et al.",
    title:
      "Association of Impaired Relaxation Mitral Inflow Pattern (Grade 1 Diastolic Function) With Long-Term Noncardiovascular and Cardiovascular Mortality",
    journal: "Journal of the American Society of Echocardiography (2025)",
    url: "https://onlinejase.com/article/S0894-7317(25)00036-7/abstract",
  },
  modes: [
    {
      id: "standard",
      name: "Mayo Standard Algorithm",
      description:
        "This algorithm applies to patients with an EF ≥ 50% and without heart failure or significant valve disease",
      startNodeId: "initialDataCollection",
    },
  ],
  startNodeId: "initialDataCollection",
  nodes: {
    // Input nodes for data collection
    initialDataCollection: {
      id: "initialDataCollection",
      type: "input",
      question: "What is the septal e' velocity?",
      options: [
        { value: "normal", text: "≥ 7 cm/s" },
        { value: "abnormal", text: "< 7 cm/s" },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: {
        "*": "eToERatio", // Go to next question regardless of answer
      },
    },
    eToERatio: {
      id: "eToERatio",
      type: "input",
      question: "What is the E/e' ratio?",
      options: [
        { value: "abnormal", text: "> 15" },
        { value: "normal", text: "≤ 15" },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: {
        "*": "trVelocity", // Go to next question regardless of answer
      },
    },
    trVelocity: {
      id: "trVelocity",
      type: "input",
      question: "What is the TR velocity?",
      options: [
        { value: "abnormal", text: "> 2.8 m/s" },
        { value: "normal", text: "≤ 2.8 m/s" },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: {
        "*": "laVolume", // Go to next question regardless of answer
      },
    },
    laVolume: {
      id: "laVolume",
      type: "input",
      question: "What is the LA volume index?",
      options: [
        { value: "abnormal", text: "> 34 mL/m²" },
        { value: "normal", text: "≤ 34 mL/m²" },
        { value: "unavailable", text: "Unavailable" },
      ],
      nextNodes: {
        "*": "criteriaEvaluate", // Go to evaluation after collecting data
      },
    },
    // Logic node for evaluating the collected criteria
    criteriaEvaluate: {
      id: "criteriaEvaluate",
      type: "logic",
      evaluate: (answers: Record<string, string>) => {
        // COMMON PATTERN: Majority parameter counting
        // Counts normal and abnormal parameters and routes based on majority

        // Step 1: Extract the parameters we care about
        const relevantAnswers = {
          septalE: answers["initialDataCollection"],
          eOverE: answers["eToERatio"],
          tr: answers["trVelocity"],
          laVolume: answers["laVolume"],
        };

        // Step 2: Count normal, abnormal, and available values
        const normalCount = Object.values(relevantAnswers).filter(
          (a) => a === "normal"
        ).length;
        const abnormalCount = Object.values(relevantAnswers).filter(
          (a) => a === "abnormal"
        ).length;
        const availableCount = Object.values(relevantAnswers).filter(
          (a) => a !== "unavailable"
        ).length;

        // Step 3: Apply the Mayo 2025 majority rule
        if (availableCount < 3) {
          return "resultInsufficientData";
        }

        // ≥ 3 of 4 normal OR 2 of 3 normal (if exactly 3 criteria are available)
        if (normalCount >= 3 || (availableCount === 3 && normalCount === 2)) {
          return "normalFillingPressure";
        }
        // ≥ 3 of 4 abnormal OR 2 of 3 abnormal (if exactly 3 criteria are available)
        else if (
          abnormalCount >= 3 ||
          (availableCount === 3 && abnormalCount === 2)
        ) {
          return "elevatedFillingPressure";
        }
        // Only for the 2 normal/2 abnormal case with all 4 criteria
        else if (
          normalCount === 2 &&
          abnormalCount === 2 &&
          availableCount === 4
        ) {
          return "resultIndeterminate";
        }
        // This is a safety catch for any other edge cases
        else {
          return "resultIndeterminate";
        }
      },
    },
    // Additional input nodes based on first evaluation
    normalFillingPressure: {
      id: "normalFillingPressure",
      type: "input",
      question: "What is the E/A ratio?",
      options: [
        { value: "greater", text: "> 0.8" },
        { value: "less_equal", text: "≤ 0.8" },
      ],
      nextNodes: {
        greater: "resultNormal",
        less_equal: "resultGrade1",
      },
    },
    elevatedFillingPressure: {
      id: "elevatedFillingPressure",
      type: "input",
      question: "What is the E/A ratio?",
      options: [
        { value: "greater_equal", text: "≥ 2" },
        { value: "less", text: "< 2" },
      ],
      nextNodes: {
        less: "resultGrade2",
        greater_equal: "resultGrade3",
      },
    },

    // Result nodes
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
    resultInsufficientData: {
      id: "resultInsufficientData",
      type: "result",
      resultKey: "insufficient_info",
    },
  },
};

export default mayo2025Algorithm;
