//=========================================================================
//                     MATH PROBLEMS - DIFFICULTY CLASSES
// ========================================================================

const mathSystem = require('./mathSystem');

// ============ EASY MODE ============
class Easy {
    addition() {
        const a = mathSystem.randomInt(-50, 50);
        const b = mathSystem.randomInt(-50, 50);
        const answer = a + b;

        return {
            question: `What is ${a} + ${b}?`,
            checker: (input) => {

                const userAnswer = parseInt(input.trim());
                return userAnswer === answer;
            }
        };
    }

    subtraction() {
        const a = mathSystem.randomInt(-50, 50);
        const b = mathSystem.randomInt(-50, 50);
        const answer = a - b;

        return {
            question: `What is ${a} - ${b}?`,
            checker: (input) => {

                const userAnswer = parseInt(input.trim());
                return userAnswer === answer;
            }
        };
    }

    multiplication() {
        const a = mathSystem.randomInt(0, 12);
        const b = mathSystem.randomInt(0, 12);
        const answer = a * b;

        return {
            question: `What is ${a} * ${b}?`,
            checker: (input) => {

                const userAnswer = parseInt(input.trim());
                return userAnswer === answer;
            }
        };
    }

    division() {
        const b = mathSystem.randomInt(1, 12); // Avoid division by zero
        const a = mathSystem.randomInt(0, 120);
        const answer = mathSystem.roundNumber(a / b, 2);

        return {
            question: `What is ${a} / ${b}? (Round to 2 decimal places)`,
            checker: (input) => {

                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }

    // ============ POWERS & ROOTS ============
    squareNumber() {
        const a = Math.floor(Math.random() * 20) + 1;
        const answer = a * a;

        return {
            question: `What is ${a}²?`,
            checker: (input) => {

                return parseInt(input.trim()) === answer;
            }
        };
    }

    squareRoot() {
        const perfectSquares = [1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225];
        const a = perfectSquares[Math.floor(Math.random() * perfectSquares.length)];
        const answer = Math.sqrt(a);

        return {
            question: `What is √${a}?`,
            checker: (input) => {

                return parseInt(input.trim()) === answer;
            }
        };
    }

    // ==================== ROUNDNING NUMBER =============================
    roundToTens() {

        const num = mathSystem.randomInt(11, 99);
        const answer = Math.round(num / 10) * 10;

        return {
            question: `Round ${num} to the nearest ten:`,
            checker: (input) => parseInt(input.trim()) === answer
        };

    }

    // TIME
    timeConversion() {

        const hours = mathSystem.randomInt(1, 5);
        const answer = hours * 60;

        return {
            question: `How many minutes are in ${hours} hours?`,
            checker: (input) => parseInt(input.trim()) === answer
        };

    }

    remainder() {

        const a = mathSystem.randomInt(10, 50);
        const b = mathSystem.randomInt(2, 9);
        const answer = a % b;

        return {
            question: `What is the **remainder** of ${a} ÷ ${b}?`,
            checker: (input) => parseInt(input.trim()) === answer
        };

    }

    // Đếm số cạnh (Easy)
    shapeSides() {
        const shapes = [
            { name: 'triangle', sides: 3 },
            { name: 'square', sides: 4 },
            { name: 'pentagon', sides: 5 },
            { name: 'hexagon', sides: 6 },
            { name: 'octagon', sides: 8 }
        ];
        const shape = mathSystem.randomChoice(shapes);
        return {
            question: `How many sides does a(n) **${shape.name}** have?`,
            checker: (input) => parseInt(input.trim()) === shape.sides
        };
    }

    nextNumber() {
        const num = mathSystem.randomInt(10, 200);
        const isNext = Math.random() > 0.5;
        return {
            question: isNext ? `What is the number immediately **after** ${num}?` : `What is the number immediately **before** ${num}?`,
            checker: (input) => parseInt(input.trim()) === (isNext ? num + 1 : num - 1)
        };
    }

    // ===== GREATER or LOWER than
    findMax() {

        const nums = [
            mathSystem.randomInt(1, 100),
            mathSystem.randomInt(1, 100),
            mathSystem.randomInt(1, 100)
        ];
        const answer = Math.max(...nums);

        return {
            question: `Which is the **largest** number: ${nums.join(', ')}?`,
            checker: (input) => parseInt(input.trim()) === answer
        };

    }

}

// ============ HARD MODE ============
class Hard {
    addition() {
        const a = mathSystem.randomInt(-500, 500);
        const b = mathSystem.randomInt(-500, 500);
        const answer = a + b;

        return {
            question: `What is ${a} + ${b}?`,
            checker: (input) => {

                const userAnswer = parseInt(input.trim());
                return userAnswer === answer;
            }
        };
    }

    subtraction() {
        const a = mathSystem.randomInt(-500, 500);
        const b = mathSystem.randomInt(-500, 500);
        const answer = a - b;

        return {
            question: `What is ${a} - ${b}?`,
            checker: (input) => {

                const userAnswer = parseInt(input.trim());
                return userAnswer === answer;
            }
        };
    }

    multiplication() {
        const a = mathSystem.randomInt(-50, 50);
        const b = mathSystem.randomInt(-50, 50);
        const answer = a * b;

        return {
            question: `What is ${a} * ${b}?`,
            checker: (input) => {

                const userAnswer = parseInt(input.trim());
                return userAnswer === answer;
            }
        };
    }

    division() {
        let b = mathSystem.randomInt(-250, 250);
        while (b === 0) {
            b = mathSystem.randomInt(-250, 250); // Avoid division by zero
        }
        const a = mathSystem.randomInt(-250, 250);
        const answer = mathSystem.roundNumber(a / b, 2);

        return {
            question: `What is ${a} / ${b}? (Round to 2 decimal places)`,
            checker: (input) => {

                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }

    romanNumerals() {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 50];
        const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XV', 'XX', 'XXV', 'L'];

        const idx = Math.floor(Math.random() * nums.length);

        if (Math.random() > 0.5) {
            return {
                question: `Convert ${nums[idx]} to Roman numerals`,
                checker: (input) => input.trim().toUpperCase() === romans[idx]
            };
        } else {
            return {
                question: `Convert ${romans[idx]} to a number`,
                checker: (input) => parseInt(input.trim()) === nums[idx]
            };
        }
    }


    // ============ FRACTIONS ============
    fractionAdd() {
        const num1 = mathSystem.randomInt(1, 10);
        const den = mathSystem.randomInt(2, 10);
        const num2 = mathSystem.randomInt(1, 10);

        const answerNum = num1 + num2;
        const answerDen = den;

        // Simplify the answer
        const simplified = mathSystem.simplifyFraction(answerNum, answerDen);

        return {
            question: `What is ${num1}/${den} + ${num2}/${den}? (Answer as "numerator/denominator", e.g., "5/3")`,
            checker: (input) => {
                const match = input.trim().match(/(-?\d+)\/(-?\d+)/);
                if (!match) return false;

                const userNum = parseInt(match[1]);
                const userDen = parseInt(match[2]);

                // Simplify user's answer

                const userSimplified = mathSystem.simplifyFraction(userNum, userDen);
                return userSimplified.num === simplified.num &&
                    userSimplified.den === simplified.den;
            }
        };
    }

    // ============ ALGEBRA ============
    simpleAlgebra() {
        const a = Math.floor(Math.random() * 20) + 1;
        const b = Math.floor(Math.random() * 50) + 20;
        const answer = b - a;

        return {
            question: `Solve for x: x + ${a} = ${b}`,
            checker: (input) => {

                return parseInt(input.trim()) === answer;
            }
        };
    }

    algebraMultiply() {
        const a = Math.floor(Math.random() * 12) + 2;
        const b = Math.floor(Math.random() * 50) + 10;
        const answer = Math.floor(b / a);

        // Make sure it divides evenly
        const actualB = a * answer;

        return {
            question: `Solve for x: ${a}x = ${actualB}`,
            checker: (input) => {

                return parseInt(input.trim()) === answer;
            }
        };
    }

    // ============ PERCENTAGES ============
    percentage() {
        const whole = Math.floor(Math.random() * 500) + 100;
        const percent = [10, 20, 25, 50, 75][Math.floor(Math.random() * 5)]; // Easy percentages
        const answer = mathSystem.roundNumber(whole * percent / 100, 2);

        return {
            question: `What is ${percent}% of ${whole}? (Round to 2 decimals if needed)`,
            checker: (input) => {

                const userAnswer = parseFloat(input.trim());
                return Math.abs(userAnswer - parseFloat(answer)) < 0.01;
            }
        };
    }

    percentageIncrease() {
        const original = Math.floor(Math.random() * 200) + 50;
        const percent = [10, 20, 25, 50][Math.floor(Math.random() * 4)];
        const answer = mathSystem.roundNumber(original * (1 + percent / 100), 2);

        return {
            question: `If ${original} increases by ${percent}%, what is the new value? (Round to 2 decimals)`,
            checker: (input) => {

                const userAnswer = parseFloat(input.trim());
                return Math.abs(userAnswer - parseFloat(answer)) < 0.01;
            }
        };
    }

    // ============ ORDER OF OPERATIONS ============
    orderOfOperations() {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const c = Math.floor(Math.random() * 10) + 1;
        const answer = a + b * c;

        return {
            question: `What is ${a} + ${b} * ${c}?`,
            checker: (input) => {

                return parseInt(input.trim()) === answer;
            }
        };
    }

    // =========== Trigonometric Extensions ==================
    // Sine
    sine() {
        const a = mathSystem.randomInt(0, 360);
        const answer = mathSystem.roundNumber(Math.sin(a * Math.PI / 180), 2);

        return {
            question: `What is sin(${a}°)? (Round to 2 decimals)`,
            checker: (input) => {

                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }
    // Cosine
    cosine() {
        const a = mathSystem.randomInt(0, 360);
        const answer = mathSystem.roundNumber(Math.cos(a * Math.PI / 180), 2);

        return {
            question: `What is cos(${a}°)? (Round to 2 decimals)`,
            checker: (input) => {
                const userInput = parseFloat(input.trim());
                if (isNaN(userInput)) return false;
                return Math.abs(mathSystem.roundNumber(userInput, 2) - answer) < 0.01;
            }
        };
    }
    // Tangent
    tangent() {
        const angles = [0, 30, 45, 60, 120, 135, 150, 180];
        const a = mathSystem.randomChoice(angles);
        const answer = mathSystem.roundNumber(Math.tan(a * Math.PI / 180), 2);

        return {
            question: `What is tan(${a}°)? (Round to 2 decimals)`,
            checker: (input) => {
                const userInput = parseFloat(input.trim());
                if (isNaN(userInput)) return false;
                return Math.abs(mathSystem.roundNumber(userInput, 2) - answer) < 0.01;
            }
        };
    }

    // Cotangent
    cotangent() {
        const angles = [30, 45, 60, 90, 120, 135, 150];
        const a = mathSystem.randomChoice(angles);
        const answer = mathSystem.roundNumber(1 / Math.tan(a * Math.PI / 180), 2);

        return {
            question: `What is cot(${a}°)? (Round to 2 decimals)`,
            checker: (input) => {
                const userInput = parseFloat(input.trim());
                if (isNaN(userInput)) return false;
                return Math.abs(mathSystem.roundNumber(userInput, 2) - answer) < 0.01;
            }
        };
    }
    // =========== Pythagoras & Trigonometry ==================
    pythagorasHypotenuse() {

        const angles = [30, 45, 60];
        const angle = mathSystem.randomChoice(angles);
        const opposite = mathSystem.randomInt(1, 20);
        const rawAnswer = opposite / Math.sin(angle * Math.PI / 180);
        const answer = mathSystem.roundNumber(rawAnswer, 2);

        return {
            question: `A right triangle has an angle of ${angle}° and the opposite side is ${opposite}. How long is the hypotenuse? (Round to 2 decimals)`,
            checker: (input) => {

                const userInput = parseFloat(input.trim());
                if (isNaN(userInput)) return false;
                return Math.abs(mathSystem.roundNumber(userInput, 2) - answer) < 0.01;
            }
        };
    }
    // Fractorial
    _factorial(n) {
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    factorialProblem() {
        const n = mathSystem.randomInt(1, 10);
        const answer = this._factorial(n);

        return {
            question: `What is ${n}! (factorial)?`,
            checker: (input) => {

                const userInput = parseInt(input.trim());
                return userInput === answer;
            }
        };
    }
    // =========== Circle Calculations ==================
    circleDiameter() {
        // Tạo bán kính ngẫu nhiên từ 1 đến 10 để số không quá lớn
        const radius = mathSystem.randomInt(1, 100);
        // Tính chu vi: C = 2 * PI * R
        const circumference = mathSystem.roundNumber(2 * Math.PI * radius, 2);

        // Đáp án là đường kính: D = C / PI (hoặc 2 * R)
        // Ở đây ta đố ngược từ chu vi để tính đường kính
        const answer = 2 * radius;

        return {
            question: `A circle has a circumference of ${circumference}. What is its diameter? (Round to nearest integer)`,
            checker: (input) => {

                const userInput = parseInt(input.trim());
                if (isNaN(userInput)) return false;
                return userInput === answer;
            }
        };
    }

    sectorArea() {
        const r = mathSystem.randomInt(2, 15);
        const n = mathSystem.randomInt(10, 150); // Góc ngẫu nhiên bất kỳ

        // Công thức: (PI * R^2 * n) / 360
        const answer = mathSystem.roundNumber((Math.PI * Math.pow(r, 2) * n) / 360, 2);

        return {
            question: `Find the area of a circular sector with radius R = ${r} and central angle n = ${n}°? (Round to 2 decimals)`,
            checker: (input) => {

                const userInput = parseFloat(input.trim());
                if (isNaN(userInput)) return false;
                return Math.abs(mathSystem.roundNumber(userInput, 2) - answer) < 0.01;
            }
        };
    }
    segmentArea() {
        const r = mathSystem.randomInt(5, 15);
        const n = mathSystem.randomInt(20, 150);

        // S_quạt = (PI * R^2 * n) / 360
        const sSector = (Math.PI * Math.pow(r, 2) * n) / 360;
        // S_tam_giác = 1/2 * R^2 * sin(n)
        const sTriangle = 0.5 * Math.pow(r, 2) * Math.sin(n * Math.PI / 180);

        const answer = mathSystem.roundNumber(sSector - sTriangle, 2);

        return {
            question: `Find the area of a circular segment with radius R = ${r} and central angle n = ${n}°? (Round to 2 decimals)`,
            checker: (input) => {

                const userInput = parseFloat(input.trim());
                if (isNaN(userInput)) return false;
                return Math.abs(mathSystem.roundNumber(userInput, 2) - answer) < 0.01;
            }
        };
    }

    coneVolume() {
        const r = mathSystem.randomInt(3, 15);
        const h = mathSystem.randomInt(5, 20);
        const answer = mathSystem.roundNumber((1 / 3) * Math.PI * Math.pow(r, 2) * h, 2);

        return {
            question: `Find the volume of a cone with radius R = ${r} and height h = ${h}? (Round to 2 decimals)`,
            checker: (input) => {
                const userInput = parseFloat(input.trim());
                return !isNaN(userInput) && Math.abs(mathSystem.roundNumber(userInput, 2) - answer) < 0.01;
            }
        };
    }

    lawOfCosines() {
        const b = mathSystem.randomInt(5, 15);
        const c = mathSystem.randomInt(5, 15);
        const angleA = mathSystem.randomInt(30, 150);

        const cosA = Math.cos(angleA * Math.PI / 180);
        const a = Math.sqrt(Math.pow(b, 2) + Math.pow(c, 2) - 2 * b * c * cosA);
        const answer = mathSystem.roundNumber(a, 2);

        return {
            question: `Triangle ABC has side b = ${b}, c = ${c} and angle A = ${angleA}°. Find side a? (Round to 2 decimals)`,
            checker: (input) => {
                const userInput = parseFloat(input.trim());
                return !isNaN(userInput) && Math.abs(mathSystem.roundNumber(userInput, 2) - answer) < 0.01;
            }
        };
    }

    sphereSurfaceArea() {
        const r = mathSystem.randomInt(2, 20);
        const answer = mathSystem.roundNumber(4 * Math.PI * Math.pow(r, 2), 2);

        return {
            question: `Find the surface area of a sphere with radius R = ${r}? (Round to 2 decimals)`,
            checker: (input) => {
                const userInput = parseFloat(input.trim());
                return !isNaN(userInput) && Math.abs(mathSystem.roundNumber(userInput, 2) - answer) < 0.01;
            }
        };
    }
    // =============== CUBE SYSTEM AREA PROBLEMS ===================

    rectPrismLateralArea() {

        const l = mathSystem.randomInt(3, 15); // chiều dài
        const w = mathSystem.randomInt(3, 15); // chiều rộng
        const h = mathSystem.randomInt(5, 20); // chiều cao

        const answer = 2 * (l + w) * h;

        return {
            question: `A rectangular prism has length = ${l}, width = ${w}, and height = ${h}. What is its **lateral area**?`,
            checker: (input) => {

                const userInput = parseFloat(input.trim());
                return !isNaN(userInput) && userInput === answer;

            }
        };
    }

    rectPrismVolume() {

        const l = mathSystem.randomInt(2, 15);
        const w = mathSystem.randomInt(2, 10);
        const h = mathSystem.randomInt(5, 12);

        const answer = l * w * h;

        return {
            question: `Find the **volume** of a rectangular prism with dimensions: ${l} x ${w} x ${h}?`,
            checker: (input) => {

                const userInput = parseFloat(input.trim());
                return !isNaN(userInput) && userInput === answer;

            }
        };
    }
    // ============ LOG =================

    logarithm() {

        const bases = [2, 5, 10];
        const base = mathSystem.randomChoice(bases);
        const exponent = mathSystem.randomInt(1, 5);
        const value = Math.pow(base, exponent);

        const answer = exponent;

        return {
            question: `What is log${base}(${value})?`,
            checker: (input) => {

                return parseInt(input.trim()) === answer;
            }
        };

    }

    complexAddition() {

        const a = mathSystem.randomInt(-10, 10);
        const b = mathSystem.randomInt(-10, 10);
        const c = mathSystem.randomInt(-10, 10);
        const d = mathSystem.randomInt(-10, 10);

        const resReal = a + c;
        const resImag = b + d;
        const answer = `${resReal}${resImag >= 0 ? '+' : ''}${resImag}i`.replace(/\s+/g, '');

        return {
            question: `Calculate: (${a} + ${b}i) + (${c} + ${d}i)? (Format: a+bi)`,
            checker: (input) => {
                const userAns = input.trim().toLowerCase().replace(/\s+/g, '');
                return userAns === answer.toLowerCase();
            }
        };
    }

    sigmaLinear() {

        const a = mathSystem.randomInt(2, 5);
        const b = mathSystem.randomInt(1, 10);
        const start = mathSystem.randomInt(1, 10);
        const end = start + mathSystem.randomInt(5, 15);

        let answer = 0;
        for (let i = start; i <= end; i++) {
            answer += (a * i + b);
        }

        const termStart = a * start + b;
        const termNext = a * (start + 1) + b;
        const termEnd = a * end + b;

        return {
            question: `Calculate the sum: ${termStart} + ${termNext} + ... + ${termEnd} (${end - start + 1} terms)`,
            checker: (input) => {

                return parseInt(input.trim()) === answer;

            }
        };
    }

    sigmaSquared() {

        const start = mathSystem.randomInt(1, 5);
        const end = mathSystem.randomInt(15, 30);

        let answer = 0;
        for (let i = start; i <= end; i++) {
            answer += Math.pow(i, 2);
        }

        return {
            question: `Calculate the sum of the sequence:\n **${start}^2 + ${start + 1}^2 + ... + ${end}^2**`,
            checker: (input) => {

                const userAns = parseInt(input.trim().replace(/,/g, ''));
                return userAns === answer;
            }
        };

    }

    // ========== Probability =========================
    diceProbabilitySingle() {

        const types = ['even', 'odd', 'prime', 'greater than 4'];
        const type = mathSystem.randomChoice(types);

        let favorableOutcomes;
        if (type === 'even') favorableOutcomes = 3;
        else if (type === 'odd') favorableOutcomes = 3;
        else if (type === 'prime') favorableOutcomes = 3;
        else if (type === 'greater than 4') favorableOutcomes = 2;

        const answer = mathSystem.roundNumber(favorableOutcomes / 6, 2);

        return {
            question: `Rolling a fair 6-sided die once. What is the probability of getting a(n) **${type}** number? (Round to 2 decimals)`,
            checker: (input) => {

                const userAns = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAns - answer) < 0.01;

            }
        };

    }

    diceProbabilityDoubleSum() {

        const targetSum = mathSystem.randomInt(2, 12);

        let count = 0;
        for (let i = 1; i <= 6; i++) {
            for (let j = 1; j <= 6; j++) {
                if (i + j === targetSum) count++;
            }
        }

        const answer = mathSystem.roundNumber(count / 36, 2);

        return {
            question: `Rolling two fair 6-sided dice. What is the probability that the **sum** of the two numbers is **${targetSum}**? (Round to 2 decimals)`,
            checker: (input) => {

                const userAns = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAns - answer) < 0.01;

            }
        };

    }

    diceProbabilityAtLeast() {

        const targetFace = mathSystem.randomInt(1, 6);
        const answer = mathSystem.roundNumber(11 / 36, 2);

        return {
            question: `Rolling two fair 6-sided dice. What is the probability that **at least one** die shows a **${targetFace}**? (Round to 2 decimals)`,
            checker: (input) => {

                const userAns = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAns - answer) < 0.01;

            }
        };

    }

    // ============ PARABOLA / QUADRATIC ============
    parabola() {
        const a = mathSystem.randomInt(1, 5);
        const b = mathSystem.randomInt(-10, 10);
        const c = mathSystem.randomInt(-20, 20);

        // Vertex x-coordinate: -b/(2a)
        const vertexX = mathSystem.roundNumber(-b / (2 * a), 2);

        return {
            question: `What is the x-coordinate of the vertex of y = ${a}x² ${b >= 0 ? '+' : ''}${b}x ${c >= 0 ? '+' : ''}${c}? (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - vertexX) < 0.01;
            }
        };
    }

    // ============ EXPONENTIAL ============
    exponential() {
        const base = mathSystem.randomInt(2, 9);
        const exponent = mathSystem.roundNumber(Math.random() * 3 + 0.5, 2); // 0.5 to 3.5
        const answer = mathSystem.roundNumber(Math.pow(base, exponent), 2);

        return {
            question: `What is ${base}^${exponent}? (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }

    // ============ LOGARITHM ============
    logarithm() {
        const base = mathSystem.randomChoice([2, 3, 5, 10]);
        const value = mathSystem.randomInt(10, 200);
        const answer = mathSystem.roundNumber(Math.log(value) / Math.log(base), 2);

        return {
            question: `What is log${base}(${value})? (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }

    // ============ SCIENTIFIC NOTATION ============
    scientificNotation() {
        const coefficient = mathSystem.roundNumber(Math.random() * 9 + 1, 2); // 1.00 to 9.99
        const exponent = mathSystem.randomInt(-5, 8);
        const answer = mathSystem.roundNumber(coefficient * Math.pow(10, exponent), 6);

        return {
            question: `What is ${coefficient} × 10^${exponent}? (Use decimal form)`,
            checker: (input) => {
                const userAnswer = parseFloat(input.trim());
                return Math.abs(userAnswer - answer) < Math.abs(answer * 0.001); // 0.1% tolerance
            }
        };
    }

    // ============ COMPOUND INTEREST ============
    compoundInterestExtreme() {
        const principal = mathSystem.randomInt(1000, 10000);
        const rate = mathSystem.randomInt(3, 12); // percent
        const years = mathSystem.randomInt(1, 10);

        // A = P(1 + r)^t
        const amount = mathSystem.roundNumber(principal * Math.pow(1 + rate / 100, years), 2);

        return {
            question: `$${principal.toLocaleString()} at ${rate}% interest compounded annually for ${years} year(s). Final amount? (Round to 2 decimals, no commas or $)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim().replace(/[$,]/g, '')), 2);
                return Math.abs(userAnswer - amount) < 0.01;
            }
        };
    }

    // ============ QUADRATIC FORMULA ============
    quadraticFormula() {
        // ax² + bx + c = 0, find one solution
        const a = mathSystem.randomInt(1, 5);
        const b = mathSystem.randomInt(-10, 10);
        const c = mathSystem.randomInt(-20, 20);

        const discriminant = b * b - 4 * a * c;

        // Only use if it has real solutions
        if (discriminant < 0) {
            return this.quadraticFormula(); // Retry
        }

        const solution1 = mathSystem.roundNumber((-b + Math.sqrt(discriminant)) / (2 * a), 2);
        const solution2 = mathSystem.roundNumber((-b - Math.sqrt(discriminant)) / (2 * a), 2);

        return {
            question: `Solve for x using quadratic formula: ${a}x² ${b >= 0 ? '+' : ''}${b}x ${c >= 0 ? '+' : ''}${c} = 0 (Give the LARGER solution, round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                const largerSolution = Math.max(solution1, solution2);
                return Math.abs(userAnswer - largerSolution) < 0.01;
            }
        };
    }

    // ============ CIRCLE AREA ============
    circleArea() {
        const radius = mathSystem.roundNumber(Math.random() * 15 + 1, 2); // 1 to 16
        const answer = mathSystem.roundNumber(Math.PI * radius * radius, 2);

        return {
            question: `What is the area of a circle with radius ${radius}? (Use π ≈ 3.14159, round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - answer) < 0.1; // Slightly more tolerance for π
            }
        };
    }

    // ============ SPHERE VOLUME ============
    sphereVolume() {
        const radius = mathSystem.randomInt(1, 15);
        const answer = mathSystem.roundNumber((4 / 3) * Math.PI * Math.pow(radius, 3), 2);

        return {
            question: `What is the volume of a sphere with radius ${radius}? (Formula: 4/3 × π × r³, round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - answer) < 1; // Larger tolerance for big numbers
            }
        };
    }

    // ============ DISTANCE FORMULA ============
    distanceFormula() {
        const x1 = mathSystem.randomInt(-10, 10);
        const y1 = mathSystem.randomInt(-10, 10);
        const x2 = mathSystem.randomInt(-10, 10);
        const y2 = mathSystem.randomInt(-10, 10);

        const distance = mathSystem.roundNumber(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)), 2);

        return {
            question: `Distance between points (${x1}, ${y1}) and (${x2}, ${y2})? (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - distance) < 0.01;
            }
        };
    }

    // ============ PYTHAGOREAN THEOREM ============
    pythagorean() {
        const a = mathSystem.randomInt(3, 20);
        const b = mathSystem.randomInt(3, 20);
        const c = mathSystem.roundNumber(Math.sqrt(a * a + b * b), 2);

        return {
            question: `Right triangle with legs ${a} and ${b}. Find the hypotenuse. (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - c) < 0.01;
            }
        };
    }

    // ============ SLOPE ============
    slope() {
        const x1 = mathSystem.randomInt(-10, 10);
        const y1 = mathSystem.randomInt(-10, 10);
        const x2 = mathSystem.randomInt(-10, 10);
        const y2 = mathSystem.randomInt(-10, 10);

        // Avoid division by zero
        if (x1 === x2) {
            return this.slope(); // Retry
        }

        const m = mathSystem.roundNumber((y2 - y1) / (x2 - x1), 2);

        return {
            question: `What is the slope between (${x1}, ${y1}) and (${x2}, ${y2})? (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - m) < 0.01;
            }
        };
    }

    // ============ CUBE ROOT ============
    cubeRoot() {
        const n = mathSystem.randomInt(8, 1000);
        const answer = mathSystem.roundNumber(Math.cbrt(n), 2);

        return {
            question: `What is ∛${n}? (Cube root, round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }

    // ============ AVERAGE/MEAN ============
    average() {
        const numbers = [];
        const count = mathSystem.randomInt(4, 20);

        for (let i = 0; i < count; i++) {
            numbers.push(mathSystem.randomInt(10, 100));
        }

        const sum = numbers.reduce((a, b) => a + b, 0);
        const answer = mathSystem.roundNumber(sum / numbers.length, 2);

        return {
            question: `What is the average of: ${numbers.join(', ')}? (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }
    // Add these methods to your Hard class:

    // ============ EXPONENTS & ROOTS ============
    powerOfTwo() {
        const exponent = mathSystem.randomInt(5, 12);
        const answer = Math.pow(2, exponent);

        return {
            question: `What is **2^${exponent}**?`,
            checker: (input) => parseInt(input.trim().replace(/,/g, '')) === answer
        };
    }

    fourthRoot() {
        const base = mathSystem.randomInt(2, 5);
        const num = Math.pow(base, 4); // Perfect 4th power

        return {
            question: `What is the **4th root** of ${num}? (∜${num})`,
            checker: (input) => parseInt(input.trim()) === base
        };
    }

    // ============ ADVANCED FRACTIONS ============
    fractionSubtract() {
        const num1 = mathSystem.randomInt(5, 15);
        const num2 = mathSystem.randomInt(1, num1 - 1);
        const den = mathSystem.randomInt(2, 10);

        const answerNum = num1 - num2;
        const answerDen = den;
        const simplified = mathSystem.simplifyFraction(answerNum, answerDen);

        return {
            question: `What is ${num1}/${den} - ${num2}/${den}? (Answer as "numerator/denominator")`,
            checker: (input) => {
                const match = input.trim().match(/(-?\d+)\/(-?\d+)/);
                if (!match) return false;
                const userSimplified = mathSystem.simplifyFraction(parseInt(match[1]), parseInt(match[2]));
                return userSimplified.num === simplified.num && userSimplified.den === simplified.den;
            }
        };
    }

    fractionMultiply() {
        const num1 = mathSystem.randomInt(1, 8);
        const den1 = mathSystem.randomInt(2, 8);
        const num2 = mathSystem.randomInt(1, 8);
        const den2 = mathSystem.randomInt(2, 8);

        const answerNum = num1 * num2;
        const answerDen = den1 * den2;
        const simplified = mathSystem.simplifyFraction(answerNum, answerDen);

        return {
            question: `What is (${num1}/${den1}) × (${num2}/${den2})? (Answer as "numerator/denominator")`,
            checker: (input) => {
                const match = input.trim().match(/(-?\d+)\/(-?\d+)/);
                if (!match) return false;
                const userSimplified = mathSystem.simplifyFraction(parseInt(match[1]), parseInt(match[2]));
                return userSimplified.num === simplified.num && userSimplified.den === simplified.den;
            }
        };
    }

    mixedNumberToImproper() {
        const whole = mathSystem.randomInt(1, 10);
        const num = mathSystem.randomInt(1, 7);
        const den = mathSystem.randomInt(2, 8);

        const answer = (whole * den) + num;

        return {
            question: `Convert the mixed number **${whole} ${num}/${den}** to an improper fraction. What is the numerator? (denominator is ${den})`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ PERCENTAGES ADVANCED ============
    percentageDecrease() {
        const original = mathSystem.randomInt(100, 500);
        const percent = mathSystem.randomChoice([10, 15, 20, 25, 30, 40]);
        const answer = mathSystem.roundNumber(original * (1 - percent / 100), 2);

        return {
            question: `If ${original} decreases by ${percent}%, what is the new value? (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = parseFloat(input.trim());
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }

    findPercentage() {
        const part = mathSystem.randomInt(20, 80);
        const whole = mathSystem.randomInt(100, 200);
        const answer = mathSystem.roundNumber((part / whole) * 100, 2);

        return {
            question: `${part} is what percentage of ${whole}? (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = parseFloat(input.trim().replace('%', ''));
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }

    // ============ RATIOS & PROPORTIONS ============
    simpleRatio() {
        const a = mathSystem.randomInt(2, 20);
        const b = mathSystem.randomInt(2, 20);
        const gcd = mathSystem.gcd(a, b);
        const answerA = a / gcd;
        const answerB = b / gcd;

        return {
            question: `Simplify the ratio **${a}:${b}** (Answer as "a:b")`,
            checker: (input) => {
                const match = input.trim().match(/(\d+):(\d+)/);
                if (!match) return false;
                return parseInt(match[1]) === answerA && parseInt(match[2]) === answerB;
            }
        };
    }

    proportionSolve() {
        const a = mathSystem.randomInt(2, 10);
        const b = mathSystem.randomInt(2, 10);
        const c = mathSystem.randomInt(2, 15);
        const answer = (b * c) / a;

        return {
            question: `Solve the proportion: **${a}/${b} = ${c}/x**. What is x? (Round to 2 decimals if needed)`,
            checker: (input) => {
                const userAnswer = parseFloat(input.trim());
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }

    // ============ SEQUENCES ============
    arithmeticSequence() {
        const start = mathSystem.randomInt(5, 30);
        const diff = mathSystem.randomInt(2, 10);
        const term = mathSystem.randomInt(8, 15);
        const answer = start + (term - 1) * diff;

        return {
            question: `An arithmetic sequence starts at ${start} with common difference ${diff}. What is the **${term}th term**?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    geometricSequence() {
        const start = mathSystem.randomInt(2, 10);
        const ratio = mathSystem.randomChoice([2, 3]);
        const term = mathSystem.randomInt(4, 7);
        const answer = start * Math.pow(ratio, term - 1);

        return {
            question: `A geometric sequence starts at ${start} with ratio ${ratio}. What is the **${term}th term**?`,
            checker: (input) => parseInt(input.trim().replace(/,/g, '')) === answer
        };
    }

    // ============ WORD PROBLEMS ============
    ageWordProblem() {
        const current = mathSystem.randomInt(10, 40);
        const years = mathSystem.randomInt(5, 15);
        const multiplier = mathSystem.randomChoice([2, 3]);
        const answer = (current + years) * multiplier;

        return {
            question: `John is currently ${current} years old. In ${years} years, his age will be tripled. How old will he be? Wait no... His age in ${years} years, then multiplied by ${multiplier}. How old?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    distanceSpeedTime() {
        const speed = mathSystem.randomInt(40, 80);
        const time = mathSystem.roundNumber(mathSystem.randomInt(10, 40) / 10, 1); // 1.0 to 4.0 hours
        const answer = mathSystem.roundNumber(speed * time, 2);

        return {
            question: `A car travels at **${speed} km/h** for **${time} hours**. How far does it travel? (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = parseFloat(input.trim());
                return Math.abs(userAnswer - answer) < 0.01;
            }
        };
    }

    workRateProblem() {
        const aloneTime = mathSystem.randomInt(4, 12);
        const together = mathSystem.randomInt(2, aloneTime - 1);
        const answer = mathSystem.roundNumber(1 / (1 / together - 1 / aloneTime), 2);

        return {
            question: `Alice can complete a job in ${aloneTime} hours. Working together, Alice and Bob finish in ${together} hours. How long would it take Bob alone? (Round to 2 decimals)`,
            checker: (input) => {
                const userAnswer = parseFloat(input.trim());
                return Math.abs(userAnswer - answer) < 0.1;
            }
        };
    }

    // ============ INEQUALITIES ============
    solveInequality() {
        const a = mathSystem.randomInt(2, 10);
        const b = mathSystem.randomInt(10, 50);
        const answer = Math.floor(b / a);

        return {
            question: `Solve for x: **${a}x < ${b}**. What is the largest integer value of x?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ ABSOLUTE VALUE ============
    absoluteValue() {
        const a = mathSystem.randomInt(-100, -10);
        const answer = Math.abs(a);

        return {
            question: `What is |${a}|?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    absoluteValueEquation() {
        const a = mathSystem.randomInt(10, 50);
        const answer = a; // Positive solution

        return {
            question: `Solve: |x| = ${a}. What is the **positive** solution?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ EXPONENT RULES ============
    exponentMultiply() {
        const base = mathSystem.randomInt(2, 9);
        const exp1 = mathSystem.randomInt(2, 6);
        const exp2 = mathSystem.randomInt(2, 6);
        const answer = exp1 + exp2;

        return {
            question: `Simplify: **${base}^${exp1} × ${base}^${exp2}**. What is the exponent? (Answer as just the exponent number)`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    exponentDivide() {
        const base = mathSystem.randomInt(2, 9);
        const exp1 = mathSystem.randomInt(5, 10);
        const exp2 = mathSystem.randomInt(2, exp1 - 1);
        const answer = exp1 - exp2;

        return {
            question: `Simplify: **${base}^${exp1} ÷ ${base}^${exp2}**. What is the exponent?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ PRIME NUMBERS ============
    isPrime() {
        const primes = [17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73];
        const composites = [15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69];

        const isPrimeQuestion = Math.random() > 0.5;
        const num = isPrimeQuestion ?
            mathSystem.randomChoice(primes) :
            mathSystem.randomChoice(composites);

        return {
            question: `Is ${num} a prime number? (Answer: yes or no)`,
            checker: (input) => {
                const answer = input.trim().toLowerCase();
                return (isPrimeQuestion && (answer === 'yes' || answer === 'prime')) ||
                    (!isPrimeQuestion && (answer === 'no' || answer === 'composite'));
            }
        };
    }

    primeFactors() {
        const primes = [2, 3, 5, 7];
        const p1 = mathSystem.randomChoice(primes);
        const p2 = mathSystem.randomChoice(primes.filter(p => p !== p1));
        const num = p1 * p2;
        const answer = Math.min(p1, p2); // Smallest prime factor

        return {
            question: `What is the **smallest prime factor** of ${num}?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }
}

// ==================== EXTREMELY DIFFICULTY (not recommends) ===========================
class Extreme {
    systemOfEquations() {
        let x, y, a, b, c, d;
        let determinant = 0;

        while (determinant === 0) {
            x = mathSystem.randomInt(-10, 10);
            y = mathSystem.randomInt(-10, 10);
            a = mathSystem.randomInt(1, 5);
            b = mathSystem.randomInt(1, 5);
            c = mathSystem.randomInt(1, 5);
            d = mathSystem.randomInt(-5, 5);
            if (d === 0) d = 1;

            determinant = a * d - b * c;
        }

        const res1 = a * x + b * y;
        const res2 = c * x + d * y;

        const sign = d > 0 ? '+' : '-';
        const absD = Math.abs(d);

        return {
            question: `Solve the system:\n\`\`\`\n⎧ ${a}x + ${b}y = ${res1}\n⎨\n⎩ ${c}x ${sign} ${absD}y = ${res2}\n\`\`\`\n**What is x?**`,
            checker: (input) => parseInt(input.trim()) === x
        };
    }


    combinations() {
        const n = mathSystem.randomInt(5, 10);
        const r = mathSystem.randomInt(2, n - 1);

        const fact = (num) => {
            let res = 1;
            for (let i = 2; i <= num; i++) res *= i;
            return res;
        };
        const answer = fact(n) / (fact(r) * fact(n - r));

        return {
            question: `How many ways to choose ${r} items from ${n}? (Calculate C(${n}, ${r}))`,
            checker: (input) => {
                const userInput = parseInt(input.trim());
                return userInput === answer;
            }
        };
    }

    matrix2x2() {
        const a = mathSystem.randomInt(-5, 10);
        const b = mathSystem.randomInt(-5, 10);
        const c = mathSystem.randomInt(-5, 10);
        const d = mathSystem.randomInt(-5, 10);
        const answer = (a * d) - (b * c);

        return {
            question: `Calculate the determinant of matrix:\n| ${a}  ${b} |\n| ${c}  ${d} |`,
            checker: (input) => {
                const userInput = parseInt(input.trim());
                return userInput === answer;
            }
        };
    }

    // ======= EQUATIONS =============
    quadraticEquation() {
        let a, b, c, delta;
        // Đảm bảo delta > 0 để luôn có 2 nghiệm phân biệt cho khó
        do {
            a = mathSystem.randomInt(1, 5);
            b = mathSystem.randomInt(-20, 20);
            c = mathSystem.randomInt(-20, 20);
            delta = b * b - 4 * a * c;
        } while (delta <= 0);

        const x1 = (-b + Math.sqrt(delta)) / (2 * a);
        const x2 = (-b - Math.sqrt(delta)) / (2 * a);
        const answer = mathSystem.roundNumber(Math.max(x1, x2), 2);

        const bS = b >= 0 ? '+' : '-';
        const cS = c >= 0 ? '+' : '-';

        return {
            question: `Solve for x: \`${a}x² ${bS} ${Math.abs(b)}x ${cS} ${Math.abs(c)} = 0\`\n**What is the LARGER root?** (Round to 2 decimals)`,
            checker: (input) => {
                const userInput = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userInput - answer) < 0.01;
            }
        };
    }

    cubicEquation() {
        // Generate 3 roots
        const x1 = mathSystem.randomInt(-1000, 1000) / 100;
        const x2 = mathSystem.randomInt(-1000, 1000) / 100;
        const x3 = mathSystem.randomInt(-1000, 1000) / 100;

        // Calculate coefficients (Vieta's formulas for x³ + bx² + cx + d = 0)
        const b = mathSystem.roundNumber(-(x1 + x2 + x3), 2);
        const c = mathSystem.roundNumber((x1 * x2 + x2 * x3 + x3 * x1), 2);
        const d = mathSystem.roundNumber(-(x1 * x2 * x3), 2);

        const bS = b >= 0 ? '+' : '-';
        const cS = c >= 0 ? '+' : '-';
        const dS = d >= 0 ? '+' : '-';

        return {
            question: `Solve for x: \`x³ ${bS} ${Math.abs(b)}x² ${cS} ${Math.abs(c)}x ${dS} ${Math.abs(d)} = 0\`\n**What is the LARGEST root?** (Round to 2 decimals)`,
            checker: (input) => {
                const x = mathSystem.roundNumber(parseFloat(input.trim()), 2);

                // Evaluate f(x) = x³ + bx² + cx + d
                // Remember: the equation is x³ + bx² + cx + d = 0
                const result = Math.pow(x, 3) + b * Math.pow(x, 2) + c * x + d;

                // If |f(x)| < 0.5, then x is a root
                return Math.abs(result) < 0.5;
            }
        };
    }

    definiteIntegral() {
        const a = mathSystem.randomInt(0, 2); // Cận dưới
        const b = mathSystem.randomInt(3, 5); // Cận trên
        const c = mathSystem.randomInt(1, 10); // Hằng số

        // Nguyên hàm F(x) = x^3/3 + c*x
        const F = (x) => (Math.pow(x, 3) / 3) + (c * x);
        const answer = mathSystem.roundNumber(F(b) - F(a), 2);

        return {
            question: `Calculate the definite integral:
\`\`\`
  ${b}
  ∫ (x² + ${c}) dx
  ${a}
\`\`\`
(Round to 2 decimals)`,
            checker: (input) => {
                const userAns = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAns - answer) < 0.01;
            }
        };
    }

    complexMultiplication() {
        const a = mathSystem.randomInt(-5, 5);
        const b = mathSystem.randomInt(-5, 5);
        const c = mathSystem.randomInt(-5, 5);
        const d = mathSystem.randomInt(-5, 5);

        const realPart = (a * c) - (b * d);
        const imagPart = (a * d) + (b * c);

        // Format đáp án chuẩn: e.g. "2+3i" hoặc "2-3i"
        const answer = `${realPart}${imagPart >= 0 ? '+' : ''}${imagPart}i`.replace(/\s+/g, '');

        return {
            question: `Calculate: **(${a} ${b >= 0 ? '+' : ''}${b}i) * (${c} ${d >= 0 ? '+' : ''}${d}i)**\n(Format: a+bi, no spaces)`,
            checker: (input) => {
                const userAns = input.trim().toLowerCase().replace(/\s+/g, '');
                return userAns === answer.toLowerCase();
            }
        };
    }

    logBaseX() {
        const base = mathSystem.randomInt(2, 9);
        const value = mathSystem.randomInt(10, 100);
        const answer = mathSystem.roundNumber(Math.log(value) / Math.log(base), 2);

        return {
            question: `Calculate: **log_${base}(${value})**\n(Round to 2 decimals)`,
            checker: (input) => {
                const userAns = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAns - answer) < 0.01;
            }
        };
    }

    // ========================= VECTOR ===============
    vectorDotProduct() {
        const a = { x: mathSystem.randomInt(-10, 10), y: mathSystem.randomInt(-10, 10), z: mathSystem.randomInt(-10, 10) };
        const b = { x: mathSystem.randomInt(-10, 10), y: mathSystem.randomInt(-10, 10), z: mathSystem.randomInt(-10, 10) };

        const answer = (a.x * b.x) + (a.y * b.y) + (a.z * b.z);

        return {
            question: `Given vectors: \n**a = (${a.x}, ${a.y}, ${a.z})**\n**b = (${b.x}, ${b.y}, ${b.z})**\nCalculate the **dot product** (a · b)?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    vectorMagnitude() {
        const x = mathSystem.randomInt(1, 10);
        const y = mathSystem.randomInt(1, 10);
        const z = mathSystem.randomInt(1, 10);

        const answer = mathSystem.roundNumber(Math.sqrt(x * x + y * y + z * z), 2);

        return {
            question: `Calculate the **magnitude** (length) of vector **v = (${x}, ${y}, ${z})**? (Round to 2 decimals)`,
            checker: (input) => {
                const userAns = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAns - answer) < 0.01;
            }
        };
    }

    vectorCrossProduct() {
        const a = [mathSystem.randomInt(-5, 5), mathSystem.randomInt(-5, 5), mathSystem.randomInt(-5, 5)];
        const b = [mathSystem.randomInt(-5, 5), mathSystem.randomInt(-5, 5), mathSystem.randomInt(-5, 5)];

        // Tính tọa độ X của vector tích có hướng: (ay*bz - az*by)
        const ansX = (a[1] * b[2]) - (a[2] * b[1]);

        return {
            question: `Given vectors: \n**a = (${a[0]}, ${a[1]}, ${a[2]})**\n**b = (${b[0]}, ${b[1]}, ${b[2]})**\nFind the **X-coordinate** of the **cross product** (a × b)?`,
            checker: (input) => parseInt(input.trim()) === ansX
        };
    }
    // =============== BASE-N =============
    decimalToOther() {
        const num = mathSystem.randomInt(20, 255); // Giới hạn 255 để HEX ra tối đa 2 chữ số (FF)
        const bases = [
            { name: 'Binary (base 2)', value: 2 },
            { name: 'Hexadecimal (base 16)', value: 16 },
            { name: 'Octal (base 8)', value: 8 }
        ];
        const target = mathSystem.randomChoice(bases);
        const answer = num.toString(target.value).toUpperCase();

        return {
            question: `Convert the decimal number **${num}** to **${target.name}**:`,
            checker: (input) => input.trim().toUpperCase() === answer
        };
    }

    otherToDecimal() {
        const num = mathSystem.randomInt(10, 150);
        const bases = [
            { name: 'Binary', value: 2 },
            { name: 'Hexadecimal', value: 16 },
            { name: 'Octal', value: 8 }
        ];
        const source = mathSystem.randomChoice(bases);
        const representation = num.toString(source.value).toUpperCase();

        return {
            question: `Convert the **${source.name}** number **${representation}** to **Decimal (base 10)**:`,
            checker: (input) => parseInt(input.trim()) === num
        };
    }

    baseCalculation() {
        const n1 = mathSystem.randomInt(5, 50);
        const n2 = mathSystem.randomInt(5, 50);

        const bin = n1.toString(2);
        const hex = n2.toString(16).toUpperCase();
        const answer = n1 + n2;

        return {
            question: `Calculate: **${bin}** (Binary) + **${hex}** (Hexadecimal) = ?\n(Give your answer in **Decimal**)`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    //========================= My HSG MAth =======================================
    polygonSequence() {
        // Random number of sides (n), common difference (d), and smallest side (u1)
        const n = mathSystem.randomInt(5, 12);
        const d = mathSystem.randomInt(2, 5);
        const u1 = mathSystem.randomInt(10, 30);

        // Calculate largest side (un) and total Perimeter (Sn)
        const un = u1 + (n - 1) * d;
        const perimeter = (n / 2) * (u1 + un);

        return {
            question: `A polygon has a perimeter of **${perimeter}**. The lengths of its sides form an arithmetic progression with a common difference **d = ${d}**. 
            If the largest side is **${un}**, how many sides does the polygon have?`,
            checker: (input) => {
                const userAns = parseInt(input.trim());
                return userAns === n;
            }
        };
    }

    bloodPressureProblem() {
        // P(t) = 100 + 20*sin(freq*PI*t/3)
        // We pick freq and its corresponding number of solutions for P(t) = 110
        const scenarios = [
            { freq: 5, ans: 2 },
            { freq: 7, ans: 3 },
            { freq: 11, ans: 4 },
            { freq: 13, ans: 5 }
        ];
        const scenario = mathSystem.randomChoice(scenarios);

        return {
            question: `A person's blood pressure is modeled by the function: **P(t) = 100 + 20sin(${scenario.freq}πt/3)**, 
            where P(t) is in mmHg and t is in seconds. Between 0 and 1 second (0 ≤ t ≤ 1), how many times is the blood pressure exactly **110 mmHg**?`,
            checker: (input) => {
                const userAns = parseInt(input.trim());
                return userAns === scenario.ans;
            }
        };
    }

    compoundInterest() {
        const principal = mathSystem.randomInt(10, 50) * 1000000;
        const rate = mathSystem.randomInt(5, 8);
        const years = mathSystem.randomInt(2, 4);

        // A = P * (1 + r)^n
        const finalAmount = Math.round(principal * Math.pow(1 + rate / 100, years));

        return {
            question: `An amount of **$${principal.toLocaleString()}** is deposited into a bank with a compound interest rate of **${rate}% per year**. What is the total balance after **${years} years**? (Round to the nearest integer)`,
            checker: (input) => {
                // Remove commas from user input before checking
                const userAns = parseInt(input.trim().replace(/,/g, ''));
                return Math.abs(userAns - finalAmount) <= 1;
            }
        };
    }

    hsgTrigonometrySum() {
        // Năm hiện tại hoặc năm trong đề
        const year = 2023;
        const limit = Math.floor(year / 3); // Giới hạn k

        // Logic: Các nghiệm có dạng x = PI/3 + k2PI
        // Ta tìm k sao cho -2023PI/3 <= PI/3 + k2PI <= 2023PI/3
        // => -2024/6 <= k <= 2022/6 => -337.33 <= k <= 337
        const kMin = -337;
        const kMax = 337;
        const n = kMax - kMin + 1; // Số lượng nghiệm

        // Tổng cấp số cộng: S = n/2 * (x_min + x_max)
        const xMin = (Math.PI / 3) + kMin * 2 * Math.PI;
        const xMax = (Math.PI / 3) + kMax * 2 * Math.PI;
        const totalSum = (n / 2) * (xMin + xMax);

        const answer = Math.round(totalSum);

        return {
            question: `Find the sum of all solutions of the equation: 
**((1+2cosx)sinx) / ((1+2cosx)(1-cosx)) = √3** 
on the interval **[-${year}π/3, ${year}π/3]**? (Round to the nearest integer)`,
            checker: (input) => {
                const userAns = parseInt(input.trim());
                return Math.abs(userAns - answer) <= 1;
            }
        };
    }

    milkProbability() {
        // Random số lượng từng loại sữa (Tổng khoảng 20-30 hộp)
        const dau = mathSystem.randomInt(10, 12); // Strawberry
        const nho = mathSystem.randomInt(7, 9);   // Grape
        const cam = mathSystem.randomInt(4, 6);   // Orange
        const total = dau + nho + cam;
        const select = 6;

        // 1. Tổng số cách chọn 6 hộp từ 'total' hộp: C(total, 6)
        const nOmega = mathSystem.combinations(total, select);

        // 2. Tính số cách chọn KHÔNG ĐỦ 3 loại (Dùng quy tắc bù trừ hoặc tính trực tiếp)
        // Để đơn giản và chính xác, ta tính trực tiếp các bộ (i, j, k) sao cho i+j+k=6 và i,j,k >= 1
        let nA = 0;
        for (let i = 1; i <= dau; i++) {
            for (let j = 1; j <= nho; j++) {
                for (let k = 1; k <= cam; k++) {
                    if (i + j + k === select) {
                        nA += mathSystem.combinations(dau, i) *
                            mathSystem.combinations(nho, j) *
                            mathSystem.combinations(cam, k);
                    }
                }
            }
        }

        const answer = mathSystem.roundNumber(nA / nOmega, 4);

        return {
            question: `From a box of **${total}** milk cartons including **${dau} Strawberry**, **${nho} Grape**, and **${cam} Orange**, 6 cartons are randomly selected for testing. What is the probability that all 3 types of milk are included? (Round to 4 decimals)`,
            checker: (input) => {
                const userAns = mathSystem.roundNumber(parseFloat(input.trim()), 4);
                return Math.abs(userAns - answer) < 0.001;
            }
        };
    }

    binomialCoefficient() {
        const n = mathSystem.randomInt(6, 10);
        const k = mathSystem.randomInt(2, n - 1);
        const a = mathSystem.randomInt(1, 3);
        const b = mathSystem.randomInt(1, 5);

        // Hệ số của x^(n-k) là: C(n, k) * a^(n-k) * b^k
        const coeff = mathSystem.combinations(n, k) * Math.pow(a, n - k) * Math.pow(b, k);
        const powerOfX = n - k;

        return {
            question: `Find the coefficient of **x^${powerOfX}** in the expansion of **(${a}x + ${b})^${n}**?`,
            checker: (input) => parseInt(input.trim().replace(/,/g, '')) === coeff
        };
    }

    standingInLine() {
        const n = mathSystem.randomInt(3, 5); // Nam
        const m = mathSystem.randomInt(2, 3); // Nữ

        const fact = (num) => {
            let res = 1;
            for (let i = 2; i <= num; i++) res *= i;
            return res;
        };

        const answer = fact(n + 1) * fact(m);

        return {
            question: `There are **${n} boys** and **${m} girls**. How many ways can they stand in a horizontal line such that **all the girls always stand next to each other**?`,
            checker: (input) => parseInt(input.trim().replace(/,/g, '')) === answer
        };
    }

    productDecreaseLogic() {
        // b là thừa số thứ hai (đáp án)
        const b = mathSystem.randomInt(20, 150);
        // decreaseA là số đơn vị giảm của thừa số thứ nhất
        const decreaseA = mathSystem.randomInt(5, 25);
        // decreaseP là số đơn vị giảm của tích (tính ngược từ b)
        const decreaseP = b * decreaseA;

        return {
            question: `The product of two numbers decreases by **${decreaseP.toLocaleString()}** units. If the first factor is decreased by **${decreaseA}** units, what is the second factor?`,
            checker: (input) => {
                const userAns = parseInt(input.trim().replace(/,/g, ''));
                return userAns === b;
            }
        };
    }
    // Add these to your Extreme class:

    // ============ MATRIX 3x3 DETERMINANT ============
    matrix3x3() {
        const a = mathSystem.randomInt(-3, 5);
        const b = mathSystem.randomInt(-3, 5);
        const c = mathSystem.randomInt(-3, 5);
        const d = mathSystem.randomInt(-3, 5);
        const e = mathSystem.randomInt(-3, 5);
        const f = mathSystem.randomInt(-3, 5);
        const g = mathSystem.randomInt(-3, 5);
        const h = mathSystem.randomInt(-3, 5);
        const i = mathSystem.randomInt(-3, 5);

        // det = a(ei - fh) - b(di - fg) + c(dh - eg)
        const answer = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);

        return {
            question: `Calculate the determinant of the 3×3 matrix:\n\`\`\`\n| ${a}  ${b}  ${c} |\n| ${d}  ${e}  ${f} |\n| ${g}  ${h}  ${i} |\n\`\`\``,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ PERMUTATIONS ============
    permutations() {
        const n = mathSystem.randomInt(5, 8);
        const r = mathSystem.randomInt(2, n - 1);

        const fact = (num) => {
            let res = 1;
            for (let i = 2; i <= num; i++) res *= i;
            return res;
        };

        const answer = fact(n) / fact(n - r);

        return {
            question: `How many ways can you arrange ${r} items from ${n} distinct items? (Calculate P(${n}, ${r}))`,
            checker: (input) => parseInt(input.trim().replace(/,/g, '')) === answer
        };
    }

    // ============ MODULAR ARITHMETIC ============
    modularArithmetic() {
        const base = mathSystem.randomInt(2, 20);
        const exponent = mathSystem.randomInt(5, 15);
        const mod = mathSystem.randomInt(7, 20);

        // Calculate base^exponent mod mod
        let answer = 1;
        let b = base % mod;
        let e = exponent;

        while (e > 0) {
            if (e % 2 === 1) {
                answer = (answer * b) % mod;
            }
            b = (b * b) % mod;
            e = Math.floor(e / 2);
        }

        return {
            question: `What is **${base}^${exponent} mod ${mod}**?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ ARITHMETIC SERIES SUM ============
    arithmeticSeriesSum() {
        const a1 = mathSystem.randomInt(1, 20);
        const d = mathSystem.randomInt(2, 10);
        const n = mathSystem.randomInt(15, 30);

        // Sum = n/2 * (2a1 + (n-1)d)
        const answer = Math.round((n / 2) * (2 * a1 + (n - 1) * d));

        return {
            question: `Find the sum of the arithmetic sequence with first term **a₁ = ${a1}**, common difference **d = ${d}**, and **${n} terms**?`,
            checker: (input) => parseInt(input.trim().replace(/,/g, '')) === answer
        };
    }

    // ============ GEOMETRIC SERIES SUM ============
    geometricSeriesSum() {
        const a = mathSystem.randomInt(2, 10);
        const r = mathSystem.randomInt(2, 3);
        const n = mathSystem.randomInt(5, 10);

        // Sum = a * (r^n - 1) / (r - 1)
        const answer = Math.round(a * (Math.pow(r, n) - 1) / (r - 1));

        return {
            question: `Find the sum of the geometric sequence: **${a} + ${a * r} + ${a * r * r} + ...** (${n} terms, ratio r=${r})`,
            checker: (input) => parseInt(input.trim().replace(/,/g, '')) === answer
        };
    }

    // ============ DERIVATIVE ============
    derivative() {
        const a = mathSystem.randomInt(1, 5);
        const b = mathSystem.randomInt(-10, 10);
        const c = mathSystem.randomInt(-10, 10);
        const x = mathSystem.randomInt(1, 5);

        // f(x) = ax² + bx + c
        // f'(x) = 2ax + b
        const answer = 2 * a * x + b;

        return {
            question: `Given **f(x) = ${a}x² ${b >= 0 ? '+' : ''}${b}x ${c >= 0 ? '+' : ''}${c}**, what is **f'(${x})**?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ LIMIT ============
    limitProblem() {
        const a = mathSystem.randomInt(1, 5);
        const b = mathSystem.randomInt(1, 10);

        // lim (ax² + b) / x as x→∞ = ∞ (undefined)
        // But lim (ax + b) / x as x→∞ = a
        const answer = a;

        return {
            question: `Calculate: **lim (${a}x + ${b}) / x** as **x → ∞**`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ POLAR COORDINATES ============
    polarToCartesian() {
        const r = mathSystem.randomInt(5, 15);
        const theta = mathSystem.randomChoice([0, 30, 45, 60, 90, 120, 135, 150, 180]);

        const x = mathSystem.roundNumber(r * Math.cos(theta * Math.PI / 180), 2);
        const y = mathSystem.roundNumber(r * Math.sin(theta * Math.PI / 180), 2);

        return {
            question: `Convert polar coordinates **(r=${r}, θ=${theta}°)** to Cartesian. What is **x**? (Round to 2 decimals)`,
            checker: (input) => {
                const userAns = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAns - x) < 0.01;
            }
        };
    }

    // ============ MATRIX MULTIPLICATION 2x2 ============
    matrixMultiplication() {
        const a = mathSystem.randomInt(-3, 5);
        const b = mathSystem.randomInt(-3, 5);
        const c = mathSystem.randomInt(-3, 5);
        const d = mathSystem.randomInt(-3, 5);

        const e = mathSystem.randomInt(-3, 5);
        const f = mathSystem.randomInt(-3, 5);
        const g = mathSystem.randomInt(-3, 5);
        const h = mathSystem.randomInt(-3, 5);

        // First row, first column of result
        const answer = a * e + b * g;

        return {
            question: `Multiply these matrices:\n\`\`\`\n| ${a}  ${b} |   | ${e}  ${f} |\n| ${c}  ${d} | × | ${g}  ${h} |\n\`\`\`\nWhat is the **top-left element** of the result?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ FIBONACCI ============
    fibonacci() {
        const n = mathSystem.randomInt(10, 20);

        let a = 0, b = 1;
        for (let i = 2; i <= n; i++) {
            const temp = a + b;
            a = b;
            b = temp;
        }
        const answer = b;

        return {
            question: `What is the **${n}th Fibonacci number**? (F₁=1, F₂=1, F₃=2, F₄=3, ...)`,
            checker: (input) => parseInt(input.trim().replace(/,/g, '')) === answer
        };
    }

    // ============ PRIME FACTORIZATION ============
    primeFactorCount() {
        const primes = [2, 3, 5, 7, 11, 13];
        const p1 = mathSystem.randomChoice(primes);
        const p2 = mathSystem.randomChoice(primes.filter(p => p !== p1));

        const e1 = mathSystem.randomInt(2, 4);
        const e2 = mathSystem.randomInt(1, 3);

        const num = Math.pow(p1, e1) * Math.pow(p2, e2);

        // Number of divisors = (e1+1)(e2+1)
        const answer = (e1 + 1) * (e2 + 1);

        return {
            question: `How many positive divisors does **${num.toLocaleString()}** have?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ ELLIPSE ============
    ellipseArea() {
        const a = mathSystem.randomInt(3, 10);
        const b = mathSystem.randomInt(2, 8);

        const answer = mathSystem.roundNumber(Math.PI * a * b, 2);

        return {
            question: `What is the area of an ellipse with semi-major axis **a=${a}** and semi-minor axis **b=${b}**? (Formula: πab, round to 2 decimals)`,
            checker: (input) => {
                const userAns = mathSystem.roundNumber(parseFloat(input.trim()), 2);
                return Math.abs(userAns - answer) < 0.1;
            }
        };
    }

    // ============ GCD (Euclidean Algorithm) ============
    gcdProblem() {
        const a = mathSystem.randomInt(100, 500);
        const b = mathSystem.randomInt(50, 200);

        const gcd = (x, y) => {
            while (y !== 0) {
                const temp = y;
                y = x % y;
                x = temp;
            }
            return x;
        };

        const answer = gcd(a, b);

        return {
            question: `Find the **GCD (Greatest Common Divisor)** of **${a}** and **${b}**?`,
            checker: (input) => parseInt(input.trim()) === answer
        };
    }

    // ============ LCM ============
    lcmProblem() {
        const a = mathSystem.randomInt(10, 50);
        const b = mathSystem.randomInt(10, 50);

        const gcd = (x, y) => {
            while (y !== 0) {
                const temp = y;
                y = x % y;
                x = temp;
            }
            return x;
        };

        const answer = (a * b) / gcd(a, b);

        return {
            question: `Find the **LCM (Least Common Multiple)** of **${a}** and **${b}**?`,
            checker: (input) => parseInt(input.trim().replace(/,/g, '')) === answer
        };
    }

    // ============ PYTHAGOREAN TRIPLE ============
    pythagoreanTriple() {
        const m = mathSystem.randomInt(2, 5);
        const n = mathSystem.randomInt(1, m - 1);

        // Pythagorean triple formula
        const a = m * m - n * n;
        const b = 2 * m * n;
        const c = m * m + n * n;

        return {
            question: `A right triangle has legs **a=${a}** and **b=${b}**. What is the hypotenuse **c**? (Exact integer answer)`,
            checker: (input) => parseInt(input.trim()) === c
        };
    }
    // =================== simplify expressions =============
    minValueAMGM() {
        const kValues = [
            1, 4, 9, 16, 25, 36, 49, // Nhóm số chính phương (Min sẽ là số nguyên)
            2, 3, 5, 6, 8, 10, 12, 15, 18, 20, 24, 30 // Nhóm số thường (Min sẽ có số lẻ)
        ];
        const k = mathSystem.randomChoice(kValues);
        const c = mathSystem.randomInt(1, 15);

        const rawMin = 2 * Math.sqrt(k) + c;
        const finalMin = mathSystem.roundNumber(rawMin, 2);

        const questionText =
            `**Mathematics Challenge**
Find the **minimum value** of the expression **P**:
\`\`\`
     x + ${c}√x + ${k}
P = ------------
          √x
\`\`\`
*(Condition: x > 0. Round your answer to 2 decimal places if necessary)*`;

        return {
            question: questionText,
            checker: (input) => {
                const userAns = parseFloat(input.trim());
                if (isNaN(userAns)) return false;
                return mathSystem.roundNumber(userAns, 2) === finalMin;
            }
        };
    }

    hardDecimalEquation() {
        // 1. Tạo số thập phân a (nghiệm sẽ là -a)
        // Ví dụ: randomInt(500, 1500) / 100 => 5.00 đến 15.00
        const a = mathSystem.randomInt(500, 1500) / 100;

        // 2. Tính toán các hệ số theo công thức đánh giá AM-GM
        // Công thức: x² + (2a+1)x + (a²+a+2) = 2√(x + a + 1)
        // Nghiệm duy nhất: x = -a
        const b = mathSystem.roundNumber(2 * a + 1, 2);
        const c = mathSystem.roundNumber(a * a + a + 2, 4);
        const k = mathSystem.roundNumber(a + 1, 2);

        const solution = -a;

        // 3. Trình bày đề bài cho Discord
        // Sử dụng code block để các con số thập phân không bị lệch
        const questionText =
            `**Elite Challenge: Decimal Irrational Equation**
Solve for **x** in the following equation:
\`\`\`
x² + ${b}x + ${c} = 2√(x + ${k})
\`\`\`
*Condition: x ≥ -${k}*
*(Round your answer to 2 decimal places)*`;

        return {
            question: questionText,
            // Lưu nghiệm để bot đối chiếu
            answer: solution,
            checker: (input) => {
                const userAns = parseFloat(input.trim());
                if (isNaN(userAns)) return false;
                // Sử dụng module roundNumber của bạn để so sánh
                return mathSystem.roundNumber(userAns, 2) === mathSystem.roundNumber(solution, 2);
            }
        };
    }

    // Add to Extreme class:

    soundSpeedCastIron() {
        // Speed of sound in cast iron is typically 3000-5500 m/s
        // We'll work backwards from a realistic answer

        const v_air = 340; // m/s (constant)
        const v_iron = mathSystem.randomInt(3000, 5500); // Target answer

        // Generate time difference (typically 1-4 seconds)
        const timeDiff = mathSystem.roundNumber(mathSystem.randomInt(10, 40) / 10, 1); // 1.0 to 4.0 seconds

        // Calculate required pipe length
        // timeDiff = L/v_air - L/v_iron
        // L = timeDiff / (1/v_air - 1/v_iron)
        const pipeLength = mathSystem.roundNumber(
            timeDiff / (1 / v_air - 1 / v_iron),
            2
        );

        return {
            question: `To measure the speed of sound in cast iron, a physicist used a **${pipeLength}m long** cast iron pipe.
One person struck one end of the pipe with a hammer, and another at the other end heard **two knocks**:
- The first traveled through the **cast iron**
- The second traveled through the **air** inside the pipe
The two knocks were separated by **${timeDiff} seconds**.
Knowing that the speed of sound in air is **340 m/s**, calculate the **speed of sound in cast iron**.
*(Round to the nearest whole number)*`,
            checker: (input) => {
                const userAnswer = parseInt(input.trim().replace(/,/g, ''));

                // Calculate correct answer from given values
                const t_air = pipeLength / v_air;
                const t_iron = t_air - timeDiff;
                const correct_v_iron = Math.round(pipeLength / t_iron);

                // Allow ±10 m/s tolerance due to rounding
                return Math.abs(userAnswer - correct_v_iron) <= 10;
            }
        };
    }


}


module.exports = {
    Easy,
    Hard,
    Extreme
};
