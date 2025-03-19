// src/algorithms/ase2016.ts - Enhanced ASE 2016 Algorithm
import {
  Algorithm,
  DecisionNode,
  ResultNode,
  ResultKey,
  DecisionOption,
  NextNodesMap
} from "../../../types/algorithm";

// Improved mapping function to handle all response types including 'unavailable'
const mapFirstAlgoToSecondAlgo = (answers: Record<string, string>) => {
  console.log("Mapping data from 1st to 2nd algorithm", answers);
  
  // Create deep copies to avoid reference issues
  const updatedAnswers = { ...answers };
  
  // 1. Map E/e' ratio - transfer regardless of value
  if (answers['standardStart'] !== undefined) {
    if (answers['standardStart'] === 'positive' || 
        answers['standardStart'] === 'positive_septal' || 
        answers['standardStart'] === 'positive_lateral') {
      updatedAnswers['dysfunctionStep2'] = 'positive';
    } else if (answers['standardStart'] === 'negative') {
      updatedAnswers['dysfunctionStep2'] = 'negative';
    } else if (answers['standardStart'] === 'unavailable') {
      updatedAnswers['dysfunctionStep2'] = 'unavailable';
    }
    console.log(`🔄 E/e' ratio mapped: ${answers['standardStart']} → ${updatedAnswers['dysfunctionStep2']}`);
  }
  
  // 2. Map TR velocity - transfer regardless of value
  if (answers['trVelocity'] !== undefined) {
    updatedAnswers['dysfunctionTR'] = answers['trVelocity'];
    console.log(`🔄 TR velocity mapped: ${answers['trVelocity']}`);
  }
  
  // 3. Map LA volume - transfer regardless of value
  if (answers['laVolume'] !== undefined) {
    updatedAnswers['dysfunctionLA'] = answers['laVolume'];
    console.log(`🔄 LA volume mapped: ${answers['laVolume']}`);
  }
  
  // 4. Update the original answers object
  Object.keys(updatedAnswers).forEach(key => {
    answers[key] = updatedAnswers[key];
  });
  
  console.log("✅ Final mapped data:", {
    'Source E/e\'': answers['standardStart'],
    'Target E/e\'': answers['dysfunctionStep2'],
    'Source TR': answers['trVelocity'],
    'Target TR': answers['dysfunctionTR'],
    'Source LA': answers['laVolume'],
    'Target LA': answers['dysfunctionLA']
  });
  
  return answers;
};

// Helper function for creating standard decision nodes
function createDecisionNode(
  id: string,
  question: string,
  options: DecisionOption[],
  nextNodes: NextNodesMap
): DecisionNode {
  return {
    id,
    type: "decision",
    question,
    options,
    nextNodes,
  };
}

// Helper function for creating result nodes
function createResultNode(id: string, resultKey: ResultKey): ResultNode {
  return {
    id,
    type: "result",
    resultKey
  };
}

// Define the ASE 2016 algorithm
const ase2016Algorithm: Algorithm = {
  id: "ase2016",
  name: "ASE/EACVI Diastolic Function (2016)",
  description: "Widely used algorithm for assessing diastolic function",
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
    // {
    //   id: "standard",
    //   name: '"1st Algorithm" Only',
    //   description: "For normal LV function",
    //   startNodeId: "standardStart",
    // },
    // {
    //   id: "dysfunction",
    //   name: '"2nd Algorithm" Only',
    //   description: "For reduced EF or myocardial disease with normal EF",
    //   startNodeId: "dysfunctionStart",
    // },
  ],
  startNodeId: "initialAssessment",
  nodes: {
    // Initial assessment to determine which algorithm path to take
    initialAssessment: createDecisionNode(
      "initialAssessment",
      "What is the left ventricular ejection fraction (LVEF)?",
      [
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
      {
        normal: "standardStart",
        reduced: "dysfunctionStart",
        normal_with_disease: "dysfunctionStart",
      }
    ),

    // Standard algorithm nodes (1st Algorithm)
    standardStart: createDecisionNode(
      "standardStart",
      "What is the average E/e' ratio?",
      [
        { value: "positive", text: "> 14" },
        { value: "negative", text: "≤ 14 " },
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
      {
        "*": "eVelocity", // Go to next question regardless of answer
      }
    ),

    eVelocity: createDecisionNode(
      "eVelocity",
      "What are the e' velocities?",
      [
        { value: "negative", text: "Septal ≥ 7 AND Lateral ≥ 10 cm/s" },
        { value: "positive", text: "Septal < 7 OR Lateral < 10 cm/s" },
        { value: "unavailable", text: "Unavailable" },
      ],
      {
        "*": "trVelocity", // Go to next question regardless of answer
      }
    ),

    trVelocity: createDecisionNode(
      "trVelocity",
      "What is the TR Velocity?",
      [
        { value: "positive", text: ">2.8 m/s" },
        { value: "negative", text: "≤ 2.8 m/s" },
        { value: "unavailable", text: "Unavailable" },
      ],
      {
        "*": "laVolume", // Go to next question regardless of answer
      }
    ),

    laVolume: createDecisionNode(
      "laVolume",
      "What is the indexed LA Volume?",
      [
        { value: "positive", text: ">34 ml/m²" },
        { value: "negative", text: "≤ 34 ml/m²" },
        { value: "unavailable", text: "Unavailable" },
      ],
      {
        "*": "standardEvaluate", // Go to evaluation node
      }
    ),

    standardEvaluate: {
      id: "standardEvaluate",
      type: "evaluator",
      evaluate: (answers: Record<string, string>) => {
        // Count standard positive/negative criteria
        let positives = 0;
        let negatives = 0;
        let unavailables = 0;

        // Evaluate E/e' ratio including special cases for septal/lateral only
        if (
          answers["standardStart"] === "positive" ||
          answers["standardStart"] === "positive_septal" ||
          answers["standardStart"] === "positive_lateral"
        ) {
          positives++;
        } else if (answers["standardStart"] === "negative") {
          negatives++;
        } else if (answers["standardStart"] === "unavailable") {
          unavailables++;
        }

        // Evaluate e' velocity
        if (answers["eVelocity"] === "positive") {
          positives++;
        } else if (answers["eVelocity"] === "negative") {
          negatives++;
        } else if (answers["eVelocity"] === "unavailable") {
          unavailables++;
        }

        // Evaluate TR velocity
        if (answers["trVelocity"] === "positive") {
          positives++;
        } else if (answers["trVelocity"] === "negative") {
          negatives++;
        } else if (answers["trVelocity"] === "unavailable") {
          unavailables++;
        }

        // Evaluate LA volume
        if (answers["laVolume"] === "positive") {
          positives++;
        } else if (answers["laVolume"] === "negative") {
          negatives++;
        } else if (answers["laVolume"] === "unavailable") {
          unavailables++;
        }

        // Calculate available parameters
        const availableParams = 4 - unavailables;

        // Decision logic
        if (negatives > availableParams / 2) {
          return "resultNormal";
        } else if (positives > availableParams / 2) {
          // This is where we bridge to the 2nd algorithm if we started with the first
          if (answers["initialAssessment"] === "normal") {
            return "transitionToDysfunction";
          } else {
            return "resultImpairedElevated";
          }
        } else {
          return "resultIndeterminate";
        }
      },
    },

    // Transition node to 2nd algorithm - changed to evaluator
    transitionToDysfunction: {
      id: 'transitionToDysfunction',
      type: 'evaluator',
      evaluate: (answers: Record<string, string>) => {
        console.log("➡️ Starting transition to dysfunction with:", answers);
        
        // Map data from first algorithm to second
        mapFirstAlgoToSecondAlgo(answers);
        
        // Proceed to dysfunction algorithm
        return 'dysfunctionStart';
      }
    },

    // Dysfunction algorithm nodes (2nd Algorithm)
    dysfunctionStart: createDecisionNode(
      "dysfunctionStart",
      "What is the Mitral Inflow Pattern (E/A ratio)?",
      [
        { value: "gte2", text: "E/A ≥ 2" },
        { value: "mid_range", text: "E/A between 0.8 and 1.99" },
        { value: "lt08_high_e", text: "E/A ≤ 0.8 AND E > 50 cm/s" },
        { value: "lt08_low_e", text: "E/A ≤ 0.8 AND E ≤ 50 cm/s" },
      ],
      {
        gte2: "resultGrade3",
        lt08_low_e: "resultGrade1",
        lt08_high_e: "checkExistingAnswers",
        mid_range: "checkExistingAnswers",
      }
    ),

    // Modified evaluator node to check for existing answers
    checkExistingAnswers: {
      id: 'checkExistingAnswers',
      type: 'evaluator',
      evaluate: (answers: Record<string, string>) => {
        console.log("➡️ Starting checkExistingAnswers with:", answers);
        
        // First, map any existing data
        mapFirstAlgoToSecondAlgo(answers);
        
        // Now check which parameters have been answered, regardless of their value
        // What matters is whether the question was answered, not what the answer was
        const wasEeRatioAnswered = answers['dysfunctionStep2'] !== undefined;
        const wasTrVelocityAnswered = answers['dysfunctionTR'] !== undefined;
        const wasLaVolumeAnswered = answers['dysfunctionLA'] !== undefined;
        
        console.log(`⚙️ After mapping: E/e' answered: ${wasEeRatioAnswered}, TR answered: ${wasTrVelocityAnswered}, LA vol answered: ${wasLaVolumeAnswered}`);
        
        // If we already have all parameters answered, go straight to evaluation
        if (wasEeRatioAnswered && wasTrVelocityAnswered && wasLaVolumeAnswered) {
          console.log("✅ All parameters answered, proceeding to evaluation");
          return 'dysfunctionEvaluate';
        }
        
        // Route to collect only unanswered parameters
        if (!wasEeRatioAnswered) {
          console.log("⚠️ E/e' not answered, routing to collection");
          return 'dysfunctionStep2';
        } else if (!wasTrVelocityAnswered) {
          console.log("⚠️ TR velocity not answered, routing to collection");
          return 'dysfunctionTR';
        } else if (!wasLaVolumeAnswered) {
          console.log("⚠️ LA volume not answered, routing to collection");
          return 'dysfunctionLA';
        } else {
          // Fallback - shouldn't reach here
          console.log("⚠️ Unexpected state, defaulting to evaluation");
          return 'dysfunctionEvaluate';
        }
      }
    },

    dysfunctionStep2: createDecisionNode(
      "dysfunctionStep2",
      "What is the average E/e' ratio?",
      [
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
      {
        "*": "dysfunctionTR", // Go to next question regardless of answer
      }
    ),

    dysfunctionTR: createDecisionNode(
      "dysfunctionTR",
      "What is the TR Velocity?",
      [
        { value: "positive", text: "> 2.8 m/s" },
        { value: "negative", text: "≤ 2.8 m/s" },
        { value: "unavailable", text: "Unavailable" },
      ],
      {
        "*": "dysfunctionLA", // Go to next question regardless of answer
      }
    ),

    dysfunctionLA: createDecisionNode(
      "dysfunctionLA",
      "What is the indexed LA Volume?",
      [
        { value: "positive", text: "> 34 ml/m²" },
        { value: "negative", text: "≤ 34 ml/m²" },
        { value: "unavailable", text: "Unavailable" },
      ],
      {
        "*": "checkDysfunctionPVFlow", // Check if we need PV flow data
      }
    ),

    // Check if we need pulmonary vein flow data for reduced LVEF patients
    checkDysfunctionPVFlow: {
      id: "checkDysfunctionPVFlow",
      type: "evaluator",
      evaluate: (answers: Record<string, string>) => {
        console.log("➡️ Checking if PV flow is needed:", answers);
        
        // Check if any parameter is unavailable
        const hasUnavailable =
          answers["dysfunctionStep2"] === "unavailable" ||
          answers["dysfunctionTR"] === "unavailable" ||
          answers["dysfunctionLA"] === "unavailable";
        
        // Determine if we came from the reduced EF path directly
        // This includes both direct entry to dysfunction algo AND transition from 1st algo
        const isReducedEF = 
          answers["initialAssessment"] === "reduced";
        
        // Determine if we have myocardial disease with normal EF
        const isNormalEFWithDisease = 
          answers["initialAssessment"] === "normal_with_disease";
        
        console.log(`⚙️ Has unavailable parameter: ${hasUnavailable}, Reduced EF: ${isReducedEF}, Normal EF with disease: ${isNormalEFWithDisease}`);
        
        // Only ask for PV S/D ratio if:
        // 1. We have a truly reduced EF (< 50%)
        // 2. AND at least one parameter is unavailable
        if (hasUnavailable && isReducedEF) {
          console.log("✅ Proceeding to PV flow assessment (reduced EF with unavailable parameter)");
          return "dysfunctionPVFlow";
        } else {
          console.log("✅ Skipping PV flow, proceeding to evaluation");
          return "dysfunctionEvaluate";
        }
      },
    },

    dysfunctionPVFlow: createDecisionNode(
      "dysfunctionPVFlow",
      "What is the pulmonary vein S/D ratio?",
      [
        { value: "negative", text: "≥ 1" },
        { value: "positive", text: "< 1" },
        { value: "unavailable", text: "Unavailable" },
      ],
      {
        "*": "dysfunctionEvaluate", // Now go to dysfunction evaluator, not standard evaluator
      }
    ),

    dysfunctionEvaluate: {
      id: "dysfunctionEvaluate",
      type: "evaluator",
      evaluate: (answers: Record<string, string>) => {
        // Log answers to help with debugging
        console.log("All available answers for evaluation:", answers);
    
        // Get only the answers from step2 onwards
        const step2Answers: Record<string, string> = {
          dysfunctionStep2: "unavailable",
          dysfunctionTR: "unavailable",
          dysfunctionLA: "unavailable",
        };
    
        // Map standardStart (E/e') to dysfunctionStep2 if available
        if (
          answers["dysfunctionStep2"] &&
          answers["dysfunctionStep2"] !== "unavailable"
        ) {
          step2Answers["dysfunctionStep2"] = answers["dysfunctionStep2"];
          console.log(
            "Using directly provided dysfunctionStep2:",
            answers["dysfunctionStep2"]
          );
        } else if (
          answers["standardStart"] &&
          answers["standardStart"] !== "unavailable"
        ) {
          if (
            answers["standardStart"] === "positive" ||
            answers["standardStart"] === "positive_septal" ||
            answers["standardStart"] === "positive_lateral"
          ) {
            step2Answers["dysfunctionStep2"] = "positive";
            console.log("Mapped standardStart to positive");
          } else if (answers["standardStart"] === "negative") {
            step2Answers["dysfunctionStep2"] = "negative";
            console.log("Mapped standardStart to negative");
          }
        }
    
        // Map TR velocity
        if (
          answers["dysfunctionTR"] &&
          answers["dysfunctionTR"] !== "unavailable"
        ) {
          step2Answers["dysfunctionTR"] = answers["dysfunctionTR"];
          console.log("Using directly provided dysfunctionTR");
        } else if (
          answers["trVelocity"] &&
          answers["trVelocity"] !== "unavailable"
        ) {
          step2Answers["dysfunctionTR"] = answers["trVelocity"];
          console.log("Mapped trVelocity to dysfunctionTR");
        }
    
        // Map LA volume
        if (
          answers["dysfunctionLA"] &&
          answers["dysfunctionLA"] !== "unavailable"
        ) {
          step2Answers["dysfunctionLA"] = answers["dysfunctionLA"];
          console.log("Using directly provided dysfunctionLA");
        } else if (
          answers["laVolume"] &&
          answers["laVolume"] !== "unavailable"
        ) {
          step2Answers["dysfunctionLA"] = answers["laVolume"];
          console.log("Mapped laVolume to dysfunctionLA");
        }
    
        // Include pulmonary vein S/D ratio - BEFORE counting positives/negatives
        // This way the PV information is already in step2Answers when we do the counting
        if (answers["dysfunctionPVFlow"] === "positive") {
          step2Answers["pv_sd_ratio"] = "positive";
          console.log("✅ Added positive PV S/D ratio (< 1)");
        } else if (answers["dysfunctionPVFlow"] === "negative") {
          step2Answers["pv_sd_ratio"] = "negative"; 
          console.log("✅ Added negative PV S/D ratio (≥ 1)");
        }
    
        console.log("Final step 2 answers being evaluated:", step2Answers);
    
        // Count positives, negatives, and unavailables
        let positives = 0;
        let negatives = 0;
        let unavailables = 0;
    
        // Evaluate each parameter
        Object.entries(step2Answers).forEach(([key, answer]) => {
          console.log(`Evaluating ${key}: ${answer}`);
          if (answer === "positive") positives++;
          else if (answer === "negative") negatives++;
          else if (answer === "unavailable") unavailables++;
        });
    
        const availables = Object.keys(step2Answers).length - unavailables;
    
        console.log(
          `Final counts: positives=${positives}, negatives=${negatives}, availables=${availables}`
        );
    
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

    // Result nodes
    resultNormal: createResultNode("resultNormal", "normal"),
    resultGrade1: createResultNode("resultGrade1", "grade-1"),
    resultGrade2: createResultNode("resultGrade2", "grade-2"),
    resultGrade3: createResultNode("resultGrade3", "grade-3"),
    resultImpairedElevated: createResultNode(
      "resultImpairedElevated",
      "impaired-elevated"
    ),
    resultIndeterminate: createResultNode(
      "resultIndeterminate",
      "indeterminate"
    ),
    resultInsufficientInfo: createResultNode(
      "resultInsufficientInfo",
      "insufficient_info"
    ),
  },
};

export default ase2016Algorithm;