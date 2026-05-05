const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openrouter/auto';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';



export async function generateQuestion(topic, subTopic, difficulty, questionType = 'mcq', questionMode = 'general', language = 'javascript') {
  let modeDescription = '';
  const topicName = subTopic || topic;
  const langName = { js: 'JavaScript', python: 'Python', cpp: 'C++', java: 'Java', csharp: 'C#' }[language] || 'JavaScript';

  if (questionMode === 'code') {
    modeDescription = `Include a code snippet in ${langName} in the question. The question should ask about what the code does, identify bugs, or predict output.`;
  } else if (questionMode === 'complexity') {
    modeDescription = 'Focus on time complexity (Big-O) or space complexity. Ask about the complexity of algorithms, operations, or data structures.';
  } else {
    modeDescription = 'Focus on conceptual understanding, algorithms properties, and real-world applications.';
  }
  
  const systemPrompt = `You are an expert Computer Science educator specializing in algorithms and data structures.
Generate a ${difficulty} difficulty multiple choice question about ${topicName}.
The question should test understanding, not just memorization.

${modeDescription}

Guidelines:
- For MCQ: Include 4 options where only ONE is correct
- Include a brief explanation of why the correct answer is right
- Make incorrect options plausible (common mistakes students make)
- ${difficulty === 'easy' ? 'Focus on basic concepts and definitions' : difficulty === 'medium' ? 'Require application of concepts' : 'Require analysis, optimization, or debugging skills'}
- Make questions unique and different from common textbook examples
- If including code, put it in the question text

Return your response as a JSON object with this exact structure:
{
  "question": "The question text",
  "type": "${questionType}",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "subTopic": "${subTopic || topic}",
  "questionMode": "${questionMode}",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correctAnswer": "A", 
  "explanation": "Why the correct answer is correct"
}`;

  const userPrompt = `Generate a unique ${difficulty} question about ${topicName} (${questionMode} mode).
Make it different from standard textbook examples. Focus on ${topic} algorithms.`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://algoviz.example.com',
        'X-Title': 'AlgoViz AI Training',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    return generateFallbackQuestion(topic, subTopic, difficulty, questionType);
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
}

export async function evaluateAnswer(question, userAnswer, explanation) {
  const prompt = `Evaluate this answer for the question: "${question.question}"
User's answer: ${userAnswer}
${explanation ? `User's explanation: ${explanation}` : ''}

The correct answer was: ${question.correctAnswer}

Determine if the answer is correct and provide feedback.
Return a JSON with:
{
  "isCorrect": true/false,
  "feedback": "Brief explanation of why they were right or wrong",
  "nextDifficulty": "easier"/"same"/"harder" // based on performance
}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://algoviz.example.com',
        'X-Title': 'AlgoViz AI Training',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are an educational AI that evaluates student answers. Be encouraging but honest.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      return { isCorrect: userAnswer === question.correctAnswer, feedback: 'Answer evaluated.', nextDifficulty: 'same' };
    }
  } catch {
    return { isCorrect: userAnswer === question.correctAnswer, feedback: 'Answer evaluated.', nextDifficulty: 'same' };
  }
}

export async function generateTraceStep(algorithm, arrayState, stepNumber) {
  const prompt = `You are tracing the ${algorithm} algorithm.
Current array state: [${arrayState.join(', ')}]
This is step ${stepNumber + 1}

Describe what happens in this step:
- What elements are being compared?
- What elements are being swapped (if any)?
- What is the key/value being processed?
- What will be the next state?

Return JSON:
{
  "action": "compare/swap/key/select/find",
  "description": "What happens in this step",
  "indices": [i, j], // indices involved
  "nextState": [resulting array],
  "question": "What is the correct next state after this step?",
  "options": ["A) [array1]", "B) [array2]", "C) [array3]", "D) [array4]"],
  "correctAnswer": "A"
}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://algoviz.example.com',
        'X-Title': 'AlgoViz AI Training',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are an algorithm tracing teacher. Help students understand each step of algorithms.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      return generateFallbackTraceStep(algorithm, arrayState, stepNumber);
    }
  } catch {
    return generateFallbackTraceStep(algorithm, arrayState, stepNumber);
  }
}

function generateFallbackQuestion(topic, subTopic, difficulty, type) {
  const questions = {
    sorting: {
      easy: {
        question: "What is the time complexity of Quick Sort in the average case?",
        options: ["A) O(n)", "B) O(n log n)", "C) O(n²)", "D) O(log n)"],
        correctAnswer: "B",
        explanation: "Quick Sort has O(n log n) average case complexity due to the divide-and-conquer strategy.",
      },
      medium: {
        question: "Which sorting algorithm is most efficient for nearly sorted arrays?",
        options: ["A) Quick Sort", "B) Merge Sort", "C) Insertion Sort", "D) Heap Sort"],
        correctAnswer: "C",
        explanation: "Insertion Sort performs in O(n) time for nearly sorted arrays.",
      },
      hard: {
        question: "Which algorithm would you choose for sorting with worst-case guarantees?",
        options: ["A) Quick Sort", "B) Heap Sort", "C) Merge Sort", "D) Bubble Sort"],
        correctAnswer: "B",
        explanation: "Heap Sort guarantees O(n log n) worst-case time complexity.",
      },
    },
    searching: {
      easy: {
        question: "What is the time complexity of Binary Search?",
        options: ["A) O(n)", "B) O(log n)", "C) O(n²)", "D) O(1)"],
        correctAnswer: "B",
        explanation: "Binary Search halves the search space with each iteration, giving O(log n).",
      },
      medium: {
        question: "Binary Search requires which data structure property?",
        options: ["A) Linked", "B) Sorted", "C) Balanced", "D) Dense"],
        correctAnswer: "B",
        explanation: "Binary Search only works on sorted arrays.",
      },
      hard: {
        question: "What is the space complexity of iterative Binary Search?",
        options: ["A) O(n)", "B) O(log n)", "C) O(1)", "D) O(n log n)"],
        correctAnswer: "C",
        explanation: "Iterative Binary Search uses only constant extra space.",
      },
    },
    trees: {
      easy: {
        question: "What is the time complexity of searching in a balanced BST?",
        options: ["A) O(n)", "B) O(log n)", "C) O(n²)", "D) O(1)"],
        correctAnswer: "B",
        explanation: "Balanced BST guarantees O(log n) search by halving the search space.",
      },
      medium: {
        question: "What rotation balances an AVL tree with a Left-Left case?",
        options: ["A) Right rotation", "B) Left rotation", "C) LR rotation", "D) RL rotation"],
        correctAnswer: "A",
        explanation: "Left-Left case is corrected with a single right rotation.",
      },
      hard: {
        question: "In a B-Tree of order m, what is the maximum children per node?",
        options: ["A) m", "B) m-1", "C) m+1", "D) ceil(m/2)"],
        correctAnswer: "A",
        explanation: "A B-Tree of order m can have at most m children per node.",
      },
    },
  };

  const topicQuestions = questions[topic] || questions.sorting;
  const difficultyQuestions = topicQuestions[difficulty] || topicQuestions.easy;

  return {
    ...difficultyQuestions,
    type: type,
    difficulty: difficulty,
    topic: topic,
    subTopic: subTopic || topic,
    questionMode: type,
    hints: ["Review the fundamental concepts", "Think about divide-and-conquer"],
  };
}

function generateFallbackTraceStep(algorithm, array, step) {
  if (algorithm === 'bubbleSort') {
    if (step === 0) {
      return {
        action: 'compare',
        description: 'Compare first two elements',
        indices: [0, 1],
        nextState: [...array],
        question: 'Should these elements be swapped?',
        options: ['A) Yes, 5 > 3', 'B) No, 5 < 3', 'C) Yes, random', 'D) Cannot determine'],
        correctAnswer: 'A',
      };
    }
  }
  return {
    action: 'compare',
    description: 'Compare adjacent elements',
    indices: [step, step + 1],
    nextState: [...array],
    question: 'What happens in this step?',
    options: ['A) Swap', 'B) No swap', 'C) Move to end', 'D) No change'],
    correctAnswer: 'A',
  };
}