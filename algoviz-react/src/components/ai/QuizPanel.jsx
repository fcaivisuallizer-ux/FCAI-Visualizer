import { useState, useCallback, useEffect } from 'react';
import { generateQuestion } from '../../services/aiService';
import { useLang } from '../../hooks/useLang';

const CODE_LANGUAGES = [
  { value: 'js', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
];

function CodeBlock({ question }) {
  const codeMatch = question.match(/```[\s\S]*?```/);
  const code = codeMatch ? codeMatch[0].replace(/```\w*\n?/g, '').trim() : '';
  const text = question.replace(/```[\s\S]*?```/g, '').trim();
  
  return (
    <>
      {code && (
        <pre style={{ 
          background: 'var(--surface2)', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          marginBottom: '1rem',
          border: '1px solid var(--border)',
          whiteSpace: 'pre-wrap'
        }}>
          <code>{code}</code>
        </pre>
      )}
      {text && <h3 className="quiz-question-text">{text}</h3>}
    </>
  );
}

const FALLBACK_QUESTIONS = {
  sorting: {
    general: {
      easy: [
        { q: "What is the time complexity of Quick Sort in average case?", options: ["A) O(n)", "B) O(n log n)", "C) O(n²)", "D) O(log n)"], answer: "B", exp: "Quick Sort uses divide-and-conquer giving O(n log n)" },
        { q: "Which sort is stable?", options: ["A) Quick Sort", "B) Merge Sort", "C) Heap Sort", "D) Quick Sort"], answer: "B", exp: "Merge Sort preserves order of equal elements" },
        { q: "Best case of Bubble Sort?", options: ["A) O(n)", "B) O(n log n)", "C) O(n²)", "D) O(1)"], answer: "A", exp: "When already sorted, bubble sort makes one pass" },
        { q: "Which uses divide and conquer?", options: ["A) Bubble", "B) Insertion", "C) Merge", "D) Selection"], answer: "C", exp: "Merge Sort splits array and merges back" },
        { q: "Space complexity of Merge Sort?", options: ["A) O(1)", "B) O(n)", "C) O(log n)", "D) O(n²)"], answer: "B", exp: "Merge Sort needs auxiliary array" },
      ],
      medium: [
        { q: "When is Insertion Sort best?", options: ["A) Random", "B) Nearly sorted", "C) Reverse sorted", "D) Large array"], answer: "B", exp: "Nearly sorted gives O(n)" },
        { q: "Quick Sort worst case?", options: ["A) Sorted input", "B) Random", "C) Unique", "D) Duplicates"], answer: "A", exp: "Sorted input gives O(n²)" },
        { q: "Which in-place sort?", options: ["A) Merge", "B) Quick", "C) Three", "D) None"], answer: "B", exp: "Quick Sort is in-place" },
        { q: "Heap Sort time?", options: ["A) O(n)", "B) O(n log n)", "C) O(n²)", "D) O(1)"], answer: "B", exp: "Always O(n log n) guaranteed" },
        { q: "Stable sort among these?", options: ["A) Quick", "B) Heap", "C) Insertion", "D) Both C"], answer: "D", exp: "Both are stable" },
      ],
      hard: [
        { q: "3-way partition quick sort for?", options: ["A) All unique", "B) Many duplicates", "C) Sorted", "D) Reverse"], answer: "B", exp: "Dutch National Flag problem" },
        { q: "External sorting for?", options: ["A) Memory", "B) Disk data", "C) Small", "D) CPU"], answer: "B", exp: "For data too large for memory" },
        { q: "Tim Sort best for?", options: ["A) Random", "B) Real-world", "C) Sorted", "D) Reverse"], answer: "B", exp: "Real-world has runs" },
        { q: "Counting Sort for?", options: ["A) Any numbers", "B) Small range", "C) Large range", "D) Strings"], answer: "B", exp: "When range is small" },
        { q: "Radix Sort uses?", options: ["A) Compare", "B) Count Sort", "C) Quick", "D) All"], answer: "B", exp: "Uses counting sort per digit" },
      ]
    },
    code: {
      easy: [
        { q: "What does this code do?\n```\nfor i in range(n):\n  for j in range(n-i-1):\n    if arr[j] > arr[j+1]:\n      swap(arr, j, j+1)\n```", options: ["A) Selection Sort", "B) Bubble Sort", "C) Insertion Sort", "D) Quick Sort"], answer: "B", exp: "Nested loops with adjacent swaps = Bubble Sort" },
        { q: "What is the time complexity?\n```\nfor i in range(n):\n  min_idx = i\n  for j in range(i+1, n):\n    if arr[j] < arr[min_idx]:\n      min_idx = j\n  swap(arr, i, min_idx)\n```", options: ["A) O(n)", "B) O(n log n)", "C) O(n²)", "D) O(1)"], answer: "C", exp: "Two nested loops = O(n²)" },
        { q: "Which algorithm uses this pattern?\n```\nkey = arr[i]\nwhile j >= 0 and arr[j] > key:\n  arr[j+1] = arr[j]\n  j -= 1\narr[j+1] = key\n```", options: ["A) Bubble", "B) Selection", "C) Insertion", "D) Merge"], answer: "C", exp: "Shifting elements right = Insertion Sort" },
      ],
      medium: [
        { q: "What does partition() do in Quick Sort?", options: ["A) Splits array", "B) Finds pivot position", "C) Sorts completely", "D) Merges"], answer: "B", exp: "Partitions around pivot" },
        { q: "This recurrence solves to what?\nT(n) = 2T(n/2) + n", options: ["A) O(n)", "B) O(n log n)", "C) O(n²)", "D) O(log n)"], answer: "B", exp: "Master theorem gives n log n" },
      ],
      hard: [
        { q: "What does this measure?\n```\nif arr[left] <= arr[right]:\n  return mid\n```", options: ["A) Stability", "B) Pivot selection", "C) Base case", "D) Partition"], answer: "A", exp: "Compares elements for stability" },
      ]
    },
    complexity: {
      easy: [
        { q: "Quick Sort average case?", options: ["A) O(n)", "B) O(n log n)", "C) O(n²)", "D) O(log n)"], answer: "B", exp: "Divide and conquer" },
        { q: "Bubble Sort worst case?", options: ["A) O(n)", "B) O(n log n)", "C) O(n²)", "D) O(1)"], answer: "C", exp: "Two nested loops" },
        { q: "Merge Sort space?", options: ["A) O(1)", "B) O(n)", "C) O(log n)", "D) O(n²)"], answer: "B", exp: "Needs auxiliary array" },
      ],
      medium: [
        { q: "Heap Sort is?", options: ["A) Stable", "B) Unstable", "C) Depends", "D) Sometimes"], answer: "B", exp: "Swaps can change order" },
        { q: "Best sort for nearly sorted?", options: ["A) Quick", "B) Merge", "C) Insertion", "D) Heap"], answer: "C", exp: "O(n) for nearly sorted" },
      ],
      hard: [
        { q: "Introsort combines?", options: ["A) Quick+Heap+Insertion", "B) Quick+Heap+Shell", "C) Quick+Heap+Intro", "D) All three"], answer: "C", exp: "Uses intro sort (quick+heap+ insertion if recursion deep)" },
      ]
    }
  },
  searching: {
    general: {
      easy: [
        { q: "Binary Search needs?", options: ["A) Unsorted", "B) Sorted", "C) Linked", "D) Tree"], answer: "B", exp: "Works only on sorted data" },
        { q: "Binary search complexity?", options: ["A) O(n)", "B) O(log n)", "C) O(n²)", "D) O(1)"], answer: "B", exp: "Halves search space each time" },
        { q: "Linear search worst?", options: ["A) O(1)", "B) O(n)", "C) O(log n)", "D) O(n²)"], answer: "B", exp: "May need to check all" },
      ],
      medium: [
        { q: "Binary search on array size 100?", options: ["A) 100", "B) 50", "C) 7", "D) 10"], answer: "C", exp: "log₂(100) ≈ 7" },
        { q: "Interpolation search works on?", options: ["A) Random", "B) Uniform", "C) Sorted", "D) Any"], answer: "B", exp: "Requires uniform distribution" },
      ],
      hard: [
        { q: "A* search uses?", options: ["A) BFS", "B) DFS", "C) Heuristic", "D) All"], answer: "C", exp: "Uses f(n) = g(n) + h(n)" },
      ]
    },
    code: {
      easy: [
        { q: "```\nwhile left <= right:\n  mid = (left+right)//2\n  if arr[mid] == target:\n    return mid\n```", options: ["A) Linear", "B) Binary", "C) Jump", "D) Interpolation"], answer: "B", exp: "Uses mid calculation" },
      ],
      medium: [],
      hard: []
    },
    complexity: {
      easy: [
        { q: "Linear search time?", options: ["A) O(1)", "B) O(n)", "C) O(log n)", "D) O(n²)"], answer: "B" },
        { q: "Binary search time?", options: ["A) O(n)", "B) O(log n)", "C) O(n²)", "D) O(1)"], answer: "B" },
      ],
      medium: [
        { q: "Jump search uses?", options: ["A) O(√n)", "B) O(log n)", "C) O(n)", "D) O(1)"], answer: "A", exp: "Jumps by √n" },
      ],
      hard: []
    }
  },
  trees: {
    general: {
      easy: [
        { q: "BST search time (balanced)?", options: ["A) O(n)", "B) O(log n)", "C) O(1)", "D) O(n²)"], answer: "B", exp: "Balanced BST gives O(log n)" },
        { q: "AVL tree property?", options: ["A) Any", "B) Height balanced", "C) Weight balanced", "D) None"], answer: "B", exp: "Heights differ by ≤1" },
        { q: "Binary tree max nodes at level k?", options: ["A) k", "B) 2k", "C) 2^k", "D) k²"], answer: "C", exp: "Level 0 has 1, level 1 has 2, etc." },
        { q: "Inorder traversal of BST gives?", options: ["A) Pre-order", "B) Post-order", "C) Sorted order", "D) Level order"], answer: "C", exp: "Inorder gives ascending order" },
        { q: "What is a leaf node?", options: ["A) Root", "B) No children", "C) One child", "D) Two children"], answer: "B", exp: "Leaf has no children" },
      ],
      medium: [
        { q: "Red-Black tree color rule?", options: ["A) Any", "B) Root red", "C) Root black", "D) None"], answer: "C", exp: "Root must be black" },
        { q: "AVL rotation types?", options: ["A) 1", "B) 2", "C) 4", "D) 6"], answer: "C", exp: "LL, RR, LR, RL rotations" },
        { q: "BST delete leaf node?", options: ["A) Replace", "B) Remove completely", "C) Mark as deleted", "D) Nothing"], answer: "B", exp: "Simply remove the leaf" },
        { q: "Height of empty tree?", options: ["A) 0", "B) -1", "C) 1", "D) Null"], answer: "B", exp: "Conventionally -1 for empty" },
        { q: "Complete binary tree property?", options: ["A) All levels full", "B) All levels full except last", "C) Perfectly balanced", "D) Any"], answer: "B", exp: "Last level filled left to right" },
      ],
      hard: [
        { q: "B-Tree minimum degree t?", options: ["A) 1", "B) 2", "C) 3", "D) Any"], answer: "B", exp: "t ≥ 2" },
        { q: "B-Tree max keys per node?", options: ["A) t", "B) t-1", "C) 2t", "D) 2t-1"], answer: "D", exp: "Can have up to 2t-1 keys" },
        { q: "Red-Black tree height max?", options: ["A) log n", "B) 2 log n", "C) n", "D) n/2"], answer: "B", exp: "Height ≤ 2 log₂(n+1)" },
        { q: "Trie is used for?", options: ["A) Sorting", "B) String search", "C) Graph", "D) Cache"], answer: "B", exp: "Prefix-based string operations" },
        { q: "Segment tree for?", options: ["A) Point query", "B) Range query", "C) Graph", "D) Sorting"], answer: "B", exp: "Range queries and updates" },
      ]
    },
    code: {
      easy: [
        { q: "```\nclass Node:\n  def __init__(self, val):\n    self.val = val\n    self.left = None\n    self.right = None\n```\nWhat is this?", options: ["A) Tree node", "B) List node", "C) Graph node", "D) Stack"], answer: "A", exp: "Binary tree node structure" },
        { q: "```\nif root is None: return False\nif root.val == target: return True\nreturn search(root.left) or search(root.right)\n```\nWhat traversal?", options: ["A) Inorder", "B) Preorder", "C) Postorder", "D) Level"], answer: "B", exp: "Checks root before children" },
      ],
      medium: [
        { q: "Inorder traversal uses?", options: ["A) Stack", "B) Queue", "C) Both", "D) None"], answer: "A", exp: "Uses stack explicitly or recursion" },
        { q: "Level order uses?", options: ["A) Stack", "B) Queue", "C) Both", "D) None"], answer: "B", exp: "BFS uses queue" },
      ],
      hard: [
        { q: "Morris traversal uses?", options: ["A) Stack", "B) Queue", "C) No extra space", "D) Heap"], answer: "C", exp: "Threaded binary tree technique" },
      ]
    },
    complexity: {
      easy: [
        { q: "BST search (worst case)?", options: ["A) O(1)", "B) O(log n)", "C) O(n)", "D) O(n log n)"], answer: "C", exp: "Skewed tree becomes linked list" },
        { q: "Array-based tree index i children?", options: ["A) 2i, 2i+1", "B) i/2", "C) i+1", "D) None"], answer: "A", exp: "Left: 2i, Right: 2i+1" },
      ],
      medium: [
        { q: "AVL insert time?", options: ["A) O(1)", "B) O(log n)", "C) O(n)", "D) O(n log n)"], answer: "B", exp: "Rebalancing takes log n" },
        { q: "BST delete time?", options: ["A) O(1)", "B) O(log n)", "C) O(n)", "D) O(n log n)"], answer: "B", exp: "Search + potentially rebalance" },
      ],
      hard: [
        { q: "B-Tree search time?", options: ["A) O(log n)", "B) O(log_m n)", "C) O(n)", "D) O(1)"], answer: "B", exp: "Height is log_m n" },
        { q: "Trie space for n strings avg length L?", options: ["A) O(n)", "B) O(nL)", "C) O(L)", "D) O(n log L)"], answer: "B", exp: "Each character potentially new node" },
      ]
    }
  },
  graphs: {
    general: {
      easy: [
        { q: "BFS visits by?", options: ["A) Depth", "B) Level", "C) Edge", "D) Node"], answer: "B", exp: "Level by level" },
        { q: "DFS uses?", options: ["A) Queue", "B) Stack", "C) Both", "D) None"], answer: "B", exp: "Depth first uses stack" },
        { q: "Graph representation?", options: ["A) Only adjacency", "B) Only matrix", "C) Multiple ways", "D) None"], answer: "C", exp: "Adjacency list, matrix, edge list" },
        { q: "Undirected edge count formula?", options: ["A) E = V", "B) E = V(V-1)/2", "C) E = V-1", "D) Any"], answer: "B", exp: "Complete graph formula" },
        { q: "Path vs Cycle?", options: ["A) Same", "B) Path ends, cycle loops", "C) Cycle shorter", "D) None"], answer: "B", exp: "Path has distinct vertices (except start/end for cycle)" },
      ],
      medium: [
        { q: "Dijkstra for?", options: ["A) Unweighted", "B) Weighted positive", "C) Negative", "D) All"], answer: "B", exp: "No negative edges" },
        { q: "BFS finds?", options: ["A) Longest path", "B) Shortest path", "C) Cycle", "D) MST"], answer: "B", exp: "Shortest path in unweighted" },
        { q: "Topological sort for?", options: ["A) Cycles", "B) DAGs", "C) Trees", "D) All"], answer: "B", exp: "Only works on directed acyclic graphs" },
        { q: "Cycle detection in DAG?", options: ["A) DFS with visited", "B) BFS", "C) Dijkstra", "D) Kruskal"], answer: "A", exp: "DFS with recursion stack" },
        { q: "Connected components use?", options: ["A) One BFS", "B) Multiple BFS/DFS", "C) Dijkstra", "D) None"], answer: "B", exp: "Run BFS from unvisited vertices" },
      ],
      hard: [
        { q: "Floyd-Warshall is?", options: ["A) O(V³)", "B) O(V²)", "C) O(VE)", "D) O(E log V)"], answer: "A", exp: "All pairs shortest" },
        { q: "Prim's algorithm is?", options: ["A) Greedy", "B) DP", "C) Divide-conquer", "D) Backtracking"], answer: "A", exp: "Greedy approach for MST" },
        { q: "Bellman-Ford can detect?", options: ["A) No cycles", "B) Negative cycles", "C) Positive cycles", "D) All"], answer: "B", exp: "Can handle negative edges" },
        { q: "Articulation point removal causes?", options: ["A) No change", "B) Disconnects graph", "C) Creates cycle", "D) Nothing"], answer: "B", exp: "Graph becomes disconnected" },
        { q: "Kruskal uses?", options: ["A) BFS", "B) DFS", "C) Union-Find", "D) Topo sort"], answer: "C", exp: "Union-Find for cycle detection" },
      ]
    },
    code: {
      easy: [
        { q: "```\nqueue = [start]\nwhile queue:\n  node = queue.pop(0)\n  visit(node)\n  for neighbor in adj[node]:\n    queue.append(neighbor)\n```\nWhat is this?", options: ["A) DFS", "B) BFS", "C) Dijkstra", "D) Prim"], answer: "B", exp: "Uses queue, visits level by level" },
        { q: "```\nstack = [start]\nwhile stack:\n  node = stack.pop()\n  visit(node)\n  for neighbor in adj[node]:\n    stack.append(neighbor)\n```\nWhat is this?", options: ["A) BFS", "B) DFS", "C) Dijkstra", "D) Prim"], answer: "B", exp: "Uses stack, goes deep first" },
      ],
      medium: [
        { q: "Dijkstra uses?", options: ["A) Stack", "B) Queue", "C) Priority queue", "D) Array"], answer: "C", exp: "Extract min repeatedly" },
        { q: "Prim's algorithm uses?", options: ["A) Stack", "B) Queue", "C) Priority queue", "D) Heap only"], answer: "C", exp: "Greedy MST construction" },
      ],
      hard: [
        { q: "Kosaraju's algorithm finds?", options: ["A) Shortest path", "B) Strongly connected components", "C) MST", "D) Topo sort"], answer: "B", exp: "Two DFS passes with transpose" },
      ]
    },
    complexity: {
      easy: [
        { q: "BFS time complexity?", options: ["A) O(V)", "B) O(E)", "C) O(V+E)", "D) O(VE)"], answer: "C", exp: "Visit all vertices and edges" },
        { q: "DFS time complexity?", options: ["A) O(V)", "B) O(E)", "C) O(V+E)", "D) O(VE)"], answer: "C", exp: "Visit all vertices and edges" },
        { q: "Adjacency matrix space?", options: ["A) O(V)", "B) O(E)", "C) O(V²)", "D) O(V+E)"], answer: "C", exp: "V×V matrix" },
      ],
      medium: [
        { q: "Dijkstra time with binary heap?", options: ["A) O(V²)", "B) O(E log V)", "C) O(V log E)", "D) O(VE)"], answer: "B", exp: "O((V+E) log V)" },
        { q: "Adjacency list space?", options: ["A) O(V)", "B) O(E)", "C) O(V²)", "D) O(V+E)"], answer: "D", exp: "Vertices + edges storage" },
      ],
      hard: [
        { q: "Floyd-Warshall time?", options: ["A) O(V²)", "B) O(V³)", "C) O(VE)", "D) O(E log V)"], answer: "B", exp: "Triple nested loop" },
        { q: "Bellman-Ford time?", options: ["A) O(V)", "B) O(E)", "C) O(VE)", "D) O(V²)"], answer: "C", exp: "V-1 relaxations over all edges" },
      ]
    }
  }
};

const TOPIC_COLORS = {
  sorting: { bg: 'rgba(108, 99, 255, 0.15)', border: '#6c63ff', text: '#6c63ff' },
  searching: { bg: 'rgba(255, 101, 132, 0.15)', border: '#ff6584', text: '#ff6584' },
  trees: { bg: 'rgba(67, 217, 173, 0.15)', border: '#43d9ad', text: '#43d9ad' },
  graphs: { bg: 'rgba(247, 197, 159, 0.15)', border: '#f7c59f', text: '#f7c59f' },
};

function getRandomQuestion(topic, questionType = 'general') {
  const levels = ['easy', 'medium', 'hard'];
  const typeKey = questionType === 'code' ? 'code' : questionType === 'complexity' ? 'complexity' : 'general';

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const questions = FALLBACK_QUESTIONS[topic]?.[typeKey]?.[level];
    if (questions && questions.length > 0) {
      const random = questions[Math.floor(Math.random() * questions.length)];
      return {
        question: random.q,
        options: random.options,
        correctAnswer: random.answer,
        explanation: random.exp,
        topic: topic,
        source: 'built-in',
        level: level,
        questionType: questionType
      };
    }
  }

  const fallback = FALLBACK_QUESTIONS.sorting.general.easy[0];
  return {
    question: fallback.q,
    options: fallback.options,
    correctAnswer: fallback.answer,
    explanation: fallback.exp,
    topic: topic,
    source: 'built-in',
    level: 'easy',
    questionType: questionType
  };
}

export default function QuizPanel({ topic, onComplete, subTopic = null }) {
  const [started, setStarted] = useState(false);
  const [questionLimit, setQuestionLimit] = useState(10);
  const [questionMode, setQuestionMode] = useState('general');
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [source, setSource] = useState('built-in');
  const [completed, setCompleted] = useState(false);
  const [lang, setLang] = useLang('js');

  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleStart = async () => {
    console.log('Starting quiz - resetting state');
    setQuestionNumber(1);
    setScore(0);
    setCompleted(false);
    setStarted(true);
    setIsTransitioning(true);
    await loadQuestion();
    setIsTransitioning(false);
  };

  const getActualQuestionType = () => {
    return questionMode;
  };

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setSelectedAnswer(null);
    setSubmitted(false);
    setFeedback(null);
    setSource('loading');

    const actualType = getActualQuestionType();
    const actualSubTopic = subTopic || topic;

    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    const hasValidKey = apiKey && apiKey.startsWith('sk-or-v1-') && !apiKey.includes('xxxxxxxx');

    let questionData = null;
    let questionSource = 'built-in';

    if (hasValidKey) {
      try {
        questionData = await generateQuestion(topic, actualSubTopic, 'medium', 'mcq', actualType, lang);
        questionSource = 'ai';
      } catch (err) {
        console.log('AI failed, using built-in:', err.message);
        questionData = getRandomQuestion(topic, actualType);
        questionSource = 'built-in';
      }
    } else {
      questionData = getRandomQuestion(topic, actualType);
      questionSource = 'built-in';
    }
    
    if (questionData) {
      questionData.questionType = actualType;
    }

    setQuestion(questionData);
    setSource(questionSource);
    setLoading(false);
  }, [topic, subTopic, questionMode, lang]);

  const handleSubmit = () => {
    console.log('Submit clicked - submitted:', submitted, 'selectedAnswer:', selectedAnswer);
    if (!selectedAnswer || submitted) return;
    setSubmitted(true);
    const isCorrect = selectedAnswer === question.correctAnswer;
    if (isCorrect) setScore((s) => s + 10);
    setFeedback({
      isCorrect,
      feedback: isCorrect ? 'Correct!' : `Wrong! Answer: ${question.correctAnswer}`,
    });
    console.log('Feedback set:', isCorrect);
  };

  const handleNext = async () => {
    if (isTransitioning) return;
    console.log('Next clicked - submitted:', submitted, 'questionNumber:', questionNumber);
    
    if (onComplete && submitted) {
      await Promise.resolve(onComplete(topic, selectedAnswer === question.correctAnswer));
    }

    if (questionLimit !== 999 && questionNumber >= questionLimit) {
      setCompleted(true);
      return;
    }

    setIsTransitioning(true);
    setQuestionNumber((n) => n + 1);
    await loadQuestion();
    setIsTransitioning(false);
  };

  const getOptionClass = (option) => {
    const letter = option.charAt(0);
    let classes = 'quiz-option';
    if (submitted) {
      if (letter === question.correctAnswer) classes += ' correct';
      else if (letter === selectedAnswer) classes += ' incorrect';
    } else if (letter === selectedAnswer) {
      classes += ' selected';
    }
    return classes;
  };

  const topicColor = TOPIC_COLORS[topic] || TOPIC_COLORS.sorting;

  if (!started) {
    const topicColor = TOPIC_COLORS[topic] || TOPIC_COLORS.sorting;
    return (
      <div className="quiz-container" style={{ 
        borderLeftColor: topicColor.border, 
        borderLeftWidth: '4px', 
        borderLeftStyle: 'solid',
        textAlign: 'center',
        padding: '3rem 2rem'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ 
            background: topicColor.bg, 
            color: topicColor.text, 
            padding: '0.5rem 1rem', 
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '700'
          }}>
            {topic === 'sorting' && '⊞'} 
            {topic === 'searching' && '⌕'} 
            {topic === 'trees' && '⬡'} 
            {topic === 'graphs' && '◇'}
            {' '}{topic.charAt(0).toUpperCase() + topic.slice(1)} Quiz
          </span>
        </div>
        
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Questions:</span>
            <select 
              value={questionLimit}
              onChange={(e) => setQuestionLimit(Number(e.target.value))}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={999}>Unlimited</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mode:</span>
            <select
              value={questionMode}
              onChange={(e) => setQuestionMode(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              <option value="general">📚 General</option>
              <option value="code">💻 Code</option>
              <option value="complexity">📊 Complexity</option>
            </select>
          </div>

          {questionMode === 'code' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lang:</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                {CODE_LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {questionMode === 'general' ? `General ${topic} multiple choice questions` :
           questionMode === 'code' ? `Analyze code snippets related to ${topic}` :
           `Time/Space complexity questions for ${topic}`}
        </p>
        <button className="btn btn-primary" onClick={handleStart} disabled={isTransitioning} style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
          ▶ Start Quiz
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading question...</p>
      </div>
    );
  }

  if (completed) {
    const accuracy = questionNumber > 0 ? Math.round((score / (questionNumber * 10)) * 100) : 0;
    return (
      <div className="quiz-container" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>🎉 Quiz Complete!</h2>
        <div style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '0.5rem' }}>{score}</div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Points</p>
        <p style={{ marginBottom: '2rem' }}>
          You answered {questionNumber} questions
        </p>
        <button className="btn btn-primary" onClick={() => { setCompleted(false); setStarted(false); setQuestionNumber(1); setScore(0); }} style={{ fontSize: '1rem' }}>
          ↺ Try Again
        </button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="quiz-container">
        <button className="btn btn-primary" onClick={loadQuestion}>
          Start Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div className="quiz-progress">
          <span>Question {questionNumber}</span>
        </div>
        <div className="quiz-stats">
          <div className="quiz-stat">
            <div className="quiz-stat-value">{score}</div>
            <div className="quiz-stat-label">Score</div>
          </div>
        </div>
      </div>

      <div className="quiz-question" style={{ borderLeftColor: topicColor.border, borderLeftWidth: '4px', borderLeftStyle: 'solid' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {source === 'ai' && <span style={{ 
            background: 'var(--accent3)', 
            color: 'var(--bg)', 
            padding: '0.2rem 0.5rem', 
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '700'
          }}>🤖 AI</span>}
          {source === 'built-in' && <span style={{ 
            background: 'var(--surface3)', 
            color: 'var(--text-muted)', 
            padding: '0.2rem 0.5rem', 
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '600'
          }}>📚 Built-in</span>}
          {question.questionType === 'code' && <span style={{
            background: 'var(--warning)',
            color: '#000',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '700'
          }}>💻 {lang.toUpperCase()}</span>}
          {question.questionType === 'complexity' && <span style={{ 
            background: '#f7c59f', 
            color: '#000', 
            padding: '0.2rem 0.5rem', 
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '700'
          }}>📊 Complexity</span>}
        </span>
        
        {question.questionType === 'code' && question.question.includes('```') ? (
          <CodeBlock question={question.question} />
        ) : (
          <h3 className="quiz-question-text">{question.question}</h3>
        )}
      </div>

      <div className="quiz-options">
        {question.options?.map((option) => (
          <button
            key={option}
            className={getOptionClass(option)}
            onClick={() => !submitted && setSelectedAnswer(option.charAt(0))}
            disabled={submitted}
          >
            <span className="quiz-option-letter">{option.charAt(0)}</span>
            <span>{option.substring(3)}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`quiz-feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
          <div className="quiz-feedback-title">
            {feedback.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </div>
          <div className="quiz-feedback-text">
            {question.explanation || feedback.feedback}
          </div>
        </div>
      )}

      <div className="quiz-actions">
        {!submitted ? (
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!selectedAnswer || isTransitioning}
          >
            Submit Answer
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={isTransitioning}
          >
            Next Question →
          </button>
        )}
      </div>
    </div>
  );
}