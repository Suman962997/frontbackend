import React, { useEffect, useState } from "react";
import { CheckOutlined, CopyTwoTone, FileAddTwoTone } from "@ant-design/icons";
import { Card, Radio, Input, List, Modal, Progress, Space, Tooltip, Upload, message } from "antd";
import CustomButton from "../../component/buttons/CustomButton";
import { allCategories2 } from "../../utils/Options2";
import { primaryColor } from '../../style/ColorCode';
import SelectDropDown from "../../component/select/SelectDropDown";
import TableInput from "../../component/InputTable/InputTable";
// import TableInput from "../../component/InputTable/InputTable2";
import Loader from "../../component/loader/Loader";
import "../questionnaire/Questionnaire.scss"

const { TextArea } = Input;

interface ApiQuestion {
    questionNo: string;
    question: string;
    questionOptions: Array<{ option: string; value: any }>;
    questionAnswer: string | null;
}

interface ApiPart {
    partNo: string;
    subtitle: string;
    questions: ApiQuestion[];
}

interface ApiSection {
    title: string;
    section: string;
    parts: ApiPart[];
}

interface ApiResponse {
    data: ApiSection[];
}


interface BaseQuestion {
    text: string;
    choices: string[] | null;
    isMandatory: boolean;
    parent?: boolean;
    isNone?: boolean;
    label?: string;
}

interface TableQuestion extends BaseQuestion {
    type: "table";
    columns: string[];
    rows: string[];
}

interface TextQuestion extends BaseQuestion {
    type?: undefined;
    choices: null;
}

interface ChoiceQuestion extends BaseQuestion {
    type?: undefined;
    choices: string[];
}

type Question = TableQuestion | TextQuestion | ChoiceQuestion;


const SectionB: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<string>("policy");
    const [showQuestions, setShowQuestions] = useState<boolean>(false);
    const [answers, setAnswers] = useState<{ [key: string]: any }>({});
    const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: { name: string; size: string } | null }>({});
    const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
    const [isViewMode, setIsViewMode] = useState(false);
    const [singleSectionTextArea, setsingleSectionTextArea] = useState<any>();
    const [trust, setTrust] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isUnsavedModalVisible, setIsUnsavedModalVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<() => void | null>();
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, boolean>>({});


    const confirmNavigation = (action: () => void) => {
        if (hasUnsavedChanges && showQuestions) {
            setPendingAction(() => action);
            setIsUnsavedModalVisible(true);
        } else {
            action();
        }
    };




    const handleInputChange = (section: string, key: string, value: any, questionIndex: number) => {
        const questionKey = `${section}-${key}-${questionIndex}`;
        setAnswers((prevAnswers) => ({
            ...prevAnswers,
            [questionKey]: value,
        }));

        setHasUnsavedChanges(answers[questionKey] === "" ? false : true);
    };        console.log("*****",answers)



    
    const handleFileUpload = async (info: any, questionKey: string,principleKey:string) => {
        const { file } = info;
        if (!file || file.status === "uploading") return;
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file.originFileObj || file);
            formData.append('questionKey', questionKey);
            formData.append('principleKey',principleKey );

            const response = await fetch('http://127.0.0.1:1000/extract/', {
                method: 'POST',
                body: formData,
            });
            console.log("Received response status:", response.status);
            if (!response.ok) throw new Error('Upload failed');

            const responseData = await response.json();
            const newAnswers = transformApiResponseToAnswers(
                Array?.isArray(responseData?.data) ?
                    responseData.data :
                    [responseData.data || responseData]
            );

            // Update state with new answers
            setAnswers(prev => {
                const updatedAnswers = { ...prev, ...newAnswers };
                // Save to localStorage immediately
                localStorage.setItem('answeredQuestions', JSON.stringify(updatedAnswers));
                return updatedAnswers;
            });

            // Update uploaded files state
            setUploadedFiles(prev => ({
                ...prev,
                [questionKey]: {
                    name: file.name,
                    size: `${(file.size / 1024).toFixed(2)} KB`
                },
            }));

            message.success(`${file.name} processed successfully!`);
        } catch (error) {
            console.error('Upload error:', error);
            message.error('Failed to process file');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const savedAnswers = localStorage.getItem('answeredQuestions');
        if (savedAnswers) {
            try {
                const parsedAnswers = JSON.parse(savedAnswers);
                setAnswers(parsedAnswers);

                const answeredKeys = Object.keys(parsedAnswers);
                const newSubmittedAnswers = { ...submittedAnswers };
                answeredKeys.forEach(key => {
                    newSubmittedAnswers[key] = true;
                });
                setSubmittedAnswers(newSubmittedAnswers);
            } catch (e) {
                console.error("Failed to parse saved answers", e);
            }
        }
    }, []);

    interface SectionPartConfig {
        category: string;
        startIndex: number;
        questionMap?: Record<string, string>;
    }

    const sectionPartMap: Record<string, Record<string, SectionPartConfig>> = {
        'section_b': {
            'one': {
                category: 'policy',
                startIndex: 0,
                questionMap: {
                    '1': `Whether your entity’s policy/policies cover each principle and its core elements of the NGRBCs. (Yes/No)`,
                    '2': `Has the policy been approved by the Board? (Yes/No)`,
                    '3': `Web Link of the Policies, if available.`,
                    '4': `Whether the entity has translated the policy into procedures. (Yes / No)`,
                    '5': `Do the enlisted policies extend to your value chain partners? (Yes/No)`,
                    '6': `Name of the national and international codes/ certifications/labels/ standards (e.g. Forest Stewardship Council, Fairtrade, Rainforest Alliance,Trustea) standards (e.g. SA 8000, OHSAS, ISO, BIS) adopted by your entity and mapped to each principle.`,
                    '7': `Specific commitments, goals and targets set by the entity with defined timelines, if any.`,
                    '8': `Performance of the entity against the specific commitments, goals and targets along-with reasons in case the same are not met.`,

                }
            },
            'two': {
                category: 'governance',
                startIndex: 0,
                questionMap: {
                    '1': 'Statement by director responsible for the business responsibility report, highlighting ESG related challenges, targets and achievements (listed entity has flexibility regarding the placement of this disclosure)',
                    '2': 'Details of the highest authority responsible for implementation and oversight of the Business Responsibility policy (ies).',
                    '3': 'Does the entity have a specified Committee of the Board/ Director responsible for decision making on sustainability related issues? (Yes / No). If yes, provide details.',
                    '4':'Indicate whether review was undertaken by Director / Committee of the Board/ Any other Committee',
                    '5':'Frequency(Annually/ Half yearly/ Quarterly/ Any other – please specify)',
                    '6': 'Has the entity carried out independent assessment/ evaluation of the working of its policies by an external agency? (Yes/No). If yes, provide name of the agency.',
                    '7': 'If answer to question (1) above is “No” i.e. not all Principles are covered by a policy, reasons to be stated, as below:',
                    '8': 'Upstream (Suppliers & Logistics Partners)',
                    '9': 'Downstream (Distributors & Customers)y'
                }
            }
        }
    };

    const findMatchingQuestion = (
        categoryConfig: any,
        apiQuestion: any,
        questionMap: Record<string, string> = {}
    ) => {
        for (const section of categoryConfig.questions) {
            for (let questionIndex = 0; questionIndex < section.question.length; questionIndex++) {
                const targetQuestion = section.question[questionIndex];

                // Check direct question text match
                if (targetQuestion.text.includes(apiQuestion.question)) {
                    return {
                        sectionKey: section.key,
                        questionIndex,
                        targetQuestion
                    };
                }

                if (apiQuestion.questionNo && questionMap[apiQuestion.questionNo]) {
                    if (targetQuestion.text.includes(questionMap[apiQuestion.questionNo])) {
                        return {
                            sectionKey: section.key,
                            questionIndex,
                            targetQuestion
                        };
                    }
                }
            }
        }
        return null;
    };

    const transformApiResponseToAnswers = (apiData: any[]) => {
        const answers: { [key: string]: any } = {};

        apiData.forEach((section: any) => {
            const sectionName = section.section || 'section_b';
            const partsMap = sectionPartMap[sectionName] || {};

            section.parts?.forEach((part: any) => {
                const partNo = part.partNo?.toLowerCase();
                const partConfig = partsMap[partNo];
                if (!partConfig || !part.questions) return;

                const { category } = partConfig;
                console.log("This is category",category)
                const categoryConfig = allCategories2.find(c => c.key === category);
                if (!categoryConfig) return;

                part.questions.forEach((apiQuestion: any) => {
                    if (category === 'policy' && apiQuestion.questionNo === '1') {
                        const questionKey = `${category}_policy_0`;
                        const policyQuestion = categoryConfig.questions[0].question[0] as TableQuestion;

                        let parsedAnswer = apiQuestion.questionAnswer;

                        if (typeof parsedAnswer === 'string') {
                            try {
                                parsedAnswer = JSON.parse(parsedAnswer);
                            } catch {
                                parsedAnswer = {};
                            }
                        }

                        if (policyQuestion.type === 'table' && policyQuestion.rows) {
                            answers[questionKey] = policyQuestion.rows.map((row: string) => ({
                                [row]: parsedAnswer?.[row] || ''
                            }));
                        }

                        return;
                    }


                    const frontendQuestion = findMatchingQuestion(
                        categoryConfig,
                        apiQuestion,
                        partConfig.questionMap
                    );

                    if (!frontendQuestion) return;

                    const { sectionKey, questionIndex, targetQuestion } = frontendQuestion;
                    const questionKey = `${category}_${sectionKey}_${questionIndex}`;

                    if (targetQuestion.type === 'table') {
                        answers[questionKey] = transformToTableData(
                            apiQuestion.questionAnswer,
                            targetQuestion.columns,
                            targetQuestion.rows
                        );
                    } else if (targetQuestion.choices) {
                        answers[questionKey] = apiQuestion.questionAnswer;
                    } else {
                        answers[questionKey] = apiQuestion.questionAnswer || '';
                    }
                });
            });
        });

        return answers;
    };
    const transformToTableData = (
        answerData: any,
        columns: string[],
        rows?: string[]
    ): Record<string, any>[] => {
        if (!answerData) return [];

        // Handle string input (try to parse as JSON)
        if (typeof answerData === 'string') {
            try {
                answerData = JSON.parse(answerData);
            } catch {
                return [{ [columns[0]]: answerData }];
            }
        }

        // Handle array input
        if (Array?.isArray(answerData)) {
            return answerData;
        }

        // Handle object input
        if (typeof answerData === 'object') {
            if (rows && rows.length > 0) {
                return rows?.map((row: string) => ({
                    [row]: answerData[row] || ''
                }));
            }
            return Object.entries(answerData)?.map(([key, value]) => ({
                [columns[0]]: key,
                [columns[1]]: value
            }));
        }

        return [];
    };



    const handleCopyText = (text: string) => {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
            navigator.clipboard.writeText(text)
                .then(() => {
                    message.success("Question text copied to clipboard!");
                })
                .catch((err) => {
                    console.error("Clipboard copy failed:", err);
                    message.error("Failed to copy text to clipboard.");
                });
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand("copy");
                message.success("Question text copied to clipboard!");
            } catch (err) {
                console.error("Fallback clipboard copy failed:", err);
                message.error("Failed to copy text to clipboard.");
            }
            document.body.removeChild(textArea);
        }
    };


    const handleSubmitAll = (item: any) => {
        setTrust(item?.isTrusted);
        setSubmittedAnswers((prev) => ({
            ...prev,
            [item]: true,
        }));

        let anyAnswered = false;
        const currentCategory = allCategories2.find((cat) => cat.key === activeCategory);

        if (currentCategory) {
            const answeredData: any = [];

            currentCategory.questions.forEach((section: any) => {
                let answered = 0;
                const total = section.question.length;
                section.question.forEach((_: any, questionIndex: any) => {
                    const questionKey = `${activeCategory}-${section.key}-${questionIndex}`;
                    if (answers[questionKey]) {
                        console.log("section.question",section.question)
                        console.log("questionKey",questionKey)
                        console.log("answers",answers)

                        answered += 1;
                        anyAnswered = true;
                    }
                });

                const questionsAnswer = `${answered}/${total}`;
                const percentComplete = total > 0 ? Math.round((answered / total) * 100) : 0;

                section.questionsAnswer = questionsAnswer;
                section.percentComplete = percentComplete;

                answeredData.push({
                    sectionKey: section.key,
                    questionsAnswer,
                    percentComplete,
                });
            });

            localStorage.setItem(`${activeCategory}-answeredData`, JSON.stringify(answeredData));

            if (!anyAnswered) {
                message.warning("Please answer at least one question before submitting.");
            } else {
                message.success("Submitted successfully!");
                setShowQuestions(false);
            }
        }
    };

    const loadAnsweredData = (categoryKey: string, questions: any[]) => {
        const storedData = localStorage.getItem(`${categoryKey}-answeredData`);
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            questions.forEach((section) => {
                const storedSection = parsedData.find((data: any) => data.sectionKey === section.key);
                if (storedSection) {
                    section.questionsAnswer = storedSection.questionsAnswer;
                    section.percentComplete = storedSection.percentComplete;
                }
            });
        }
    };

    const handleClearUnsubmittedAnswers = () => {
        setAnswers((prevAnswers) => {
            const updatedAnswers = { ...prevAnswers };
            Object.keys(updatedAnswers).forEach((key) => {
                if (!submittedAnswers[key]) {
                    const value = updatedAnswers[key];

                    if (typeof value === 'string') {
                        if (value.trim() === "") {
                            delete updatedAnswers[key];
                        }
                    } else if (Array?.isArray(value)) {
                        if (value.length === 0) {
                            delete updatedAnswers[key];
                        }
                    } else {
                        if (!value) {
                            delete updatedAnswers[key];
                        }
                    }
                }
            });
            return updatedAnswers;
        });
    };

    const handleCategoryClick = (categoryKey: string) => {
        console.log("categorykey",categoryKey)
        confirmNavigation(() => {

            const selectedCategory = allCategories2.find((cat) => cat.key === categoryKey);
            if (selectedCategory) {
                loadAnsweredData(categoryKey, selectedCategory.questions);
            }
            setActiveCategory(categoryKey);
            const savedAnswers = localStorage.getItem('answeredQuestions');

            if (savedAnswers) {
                setAnswers(JSON.parse(savedAnswers));
            }
            handleClearUnsubmittedAnswers()
        })
    };


    useEffect(() => {
        const savedAnswers: any = localStorage.getItem('answeredQuestions');
        if (savedAnswers) {
            setAnswers(JSON.parse(savedAnswers));
        }
    }, []);

    useEffect(() => {
        const loadInitialState = () => {
            const savedAnswers = localStorage.getItem('answeredQuestions');
            if (savedAnswers) {
                try {
                    const parsedAnswers = JSON.parse(savedAnswers);
                    // Transform keys to match current format if needed
                    const transformedAnswers = Object.entries(parsedAnswers).reduce((acc, [key, value]) => {
                        // Fix key format if it's in old format
                        const newKey = key.replace(/-/g, '_');
                        acc[newKey] = value;
                        return acc;
                    }, {} as Record<string, any>);
                    setAnswers(transformedAnswers);
                } catch (e) {
                    console.error("Failed to parse saved answers", e);
                }
            }
        };
        loadInitialState();
    }, []);


    const saveAnswersToStorage = (currentAnswers: Record<string, any>) => {
        const answersToSave = Object.entries(currentAnswers).reduce((acc, [key, value]) => {
            const normalizedKey = key.replace(/-/g, '_');
            acc[normalizedKey] = value;
            return acc;
        }, {} as Record<string, any>);

        localStorage.setItem('answeredQuestions', JSON.stringify(answersToSave));
    };

    useEffect(() => {
        if (!trust) {
            setAnswers((prevAnswers) => {
                const updatedAnswers = { ...prevAnswers };
                Object.keys(updatedAnswers).forEach((key) => {
                    if (!submittedAnswers[key] && (!updatedAnswers[key])) {
                        updatedAnswers[key] = "";
                    }
                });
                return updatedAnswers;
            });
        }
    }, [trust, submittedAnswers]);

    const renderQuestionInput = (
        section: string,
        key: string,
        question: {
            text: string; choices: string[] | null; isMandatory: boolean, type: string, columns: [], rows: [],
            parent?: boolean;
            isNone?: boolean;
        },
        questionIndex: number,
        questionsArray: any[],
        qusSection: string,
    ) => {

        const getQuestionNumber = () => {
            if (question.parent) {
                let parentCount = 0;
                for (let i = 0; i <= questionIndex; i++) {
                    if (questionsArray[i].parent) {
                        parentCount++;
                    }
                }
                return `${parentCount}.`;
            } else {
                let lastParentIndex = -1;
                for (let i = questionIndex - 1; i >= 0; i--) {
                    if (questionsArray[i].parent) {
                        lastParentIndex = i;
                        break;
                    }
                }

                if (lastParentIndex === -1) return `${questionIndex + 1}.`;

                const subQuestionIndex = questionIndex - lastParentIndex - 1;
                const alphabet = String.fromCharCode(97 + subQuestionIndex);
                return `${alphabet}.`;
            }
        };

        const questionKey = `${section}-${key}-${questionIndex}`;
        const answerValue = answers[questionKey] ?? '';
        const isFileUploaded = !!uploadedFiles[questionKey];
        const isAnswered = !!answers[questionKey];
        if (isViewMode && !isAnswered) {
            return null;
}                   
                    console.log("questionKey",questionKey)
                    console.log("answer",answers)
                    console.log("columns",question.columns)
                    console.log("rows",question.rows)
                    console.log("A,S,K,Q",answers[`${section}_${key}_${questionIndex}`] || [])
                    console.log("S,K,Q",section, key,questionIndex)

        if (question?.type === 'table') {
            return (
                <div>
                    <div className="question-text">
                        <div>{qusSection}. {getQuestionNumber()} {question.text}

                            {question.isMandatory && <span className="mandatory-asterisk">*</span>}
                            {isAnswered && (
                                <Tooltip title="Answered">
                                    <CheckOutlined className="answered-icon" />
                                </Tooltip>

                            )}
                        </div>
                        <Tooltip title="Copy Question">
                            <button
                                className="copy-border"
                                onClick={() => handleCopyText(question?.text)}>
                                <CopyTwoTone
                                    className="copy-icon"
                                />
                            </button>
                        </Tooltip>
                    </div>
                    <div >
                        <TableInput
                            columns={question.columns}
                            rows={question.rows}
                            value={answers[`${section}_${key}_${questionIndex}`] || []}
                            onChange={(value: any) =>
                                handleInputChange(section, key, value, questionIndex)
                            }
                        />
                    </div>
                </div>
            );
        }
        return (
            <div>
                <div className="question-text">
                    <div>{qusSection}. {getQuestionNumber()} {question.text}
                        {question.isMandatory && <span className="mandatory-asterisk">*</span>}
                        {isAnswered && (
                            <Tooltip title="Answered">
                                <CheckOutlined className="answered-icon" />
                            </Tooltip>

                        )}
                    </div>
                    <Tooltip title="Copy Question">
                        <button
                            className="copy-border"
                            onClick={() => handleCopyText(question?.text)}>
                            <CopyTwoTone
                                className="copy-icon"
                            />
                        </button>
                    </Tooltip>
                </div>
                {question.isNone ? null : (
                    question.choices === null ? (
                        <div className="area-upload">
                            <TextArea
                                rows={3}
                                placeholder="Type your answer here"
                                value={answers[`${section}_${key}_${questionIndex}`] || ""}
                                onChange={(e) =>handleInputChange(section, key, e.target.value, questionIndex)}
                            />
                        </div>
                    ) : question.choices.length > 4 ? (
                        <SelectDropDown
                            mode="multiple"
                            options={question.choices?.map((choice) => ({
                                label: choice,
                                value: choice,
                            }))}
                            placeholder="Select options"
                            value={answers[`${section}-${key}-${questionIndex}`] || []}
                            onChange={(value) => handleInputChange(section, key, value, questionIndex)}
                        />
                    ) : (
                        <div className="question-options">
                            {question.choices?.map((option, idx) => (
                                <label key={`${option}-${idx}`}>
                                    <Space direction="vertical">
                                        <Radio
                                            key={option}
                                            value={option}
                                            checked={answers[`${section}_${key}_${questionIndex}`] === option}
                                            onChange={() =>
                                                handleInputChange(section, key, option, questionIndex)
                                            }
                                        >
                                            {option}
                                        </Radio>
                                    </Space>
                                </label>
                            ))}

                        </div>
                    )
                )}

            </div>
        );
    };

    const currentCategory = allCategories2.find((cat) => cat.key === activeCategory);
    const questions: any = currentCategory?.questions[currentSectionIndex];
    const countNonEmptyAnswers = () => {
        let nonEmptyCount = 0;
        if (currentCategory) {
            currentCategory.questions[currentSectionIndex]?.question.forEach((_, questionIndex) => {
                const questionKey = `${activeCategory}-${questions.key}-${questionIndex} `;
                if (answers[questionKey]) {
                    nonEmptyCount += 1;
                }
            });
        }

        return nonEmptyCount;
    };

    const totalTextAreasInSection = questions?.question.length || 0;

    useEffect(() => {
        setsingleSectionTextArea(totalTextAreasInSection);
    }, [totalTextAreasInSection, questions]);


    const progressPercent = singleSectionTextArea > 0
        ? Math.round((countNonEmptyAnswers() / singleSectionTextArea) * 100)
        : 0;
        console.log('@@@@@',answers)
    return (
        <div className="questionnaire-main">
            {loading && (
                <div className="loader-main">
                    <Loader />
                </div>
            )}
            <div className="questionnaire-container">
                <div className="category-card">
                    <Card title={"Categories"} bordered>
                        <List
                            key={activeCategory}
                            dataSource={allCategories2}
                            renderItem={(category, id: number) => (
                                <List.Item
                                    key={category.key}
                                    onClick={() => handleCategoryClick(category.key)}
                                    className={`category-item ${activeCategory === category.key ? "active" : ""} `}
                                >
                                    {category.section}
                                </List.Item>
                            )}
                        />
                    </Card>
                </div>
                <div className="question-card">
                    <Card
                        title={
                            <div>
                                {questions?.quesSection}
                            </div>
                        }
                        extra={
                            <div style={{ textAlign: "center", display: "flex", gap: "10px", alignItems: 'center' }}>
                                <Tooltip title="Upload">
                                    <Upload
                                        showUploadList={false}
                                        customRequest={(options) => {
                                            const { onSuccess } = options;
                                            setTimeout(() => onSuccess?.("ok"), 0);
                                        }}
                                        onChange={(info) => handleFileUpload(info, 'section_b',"null")}
                                    >
                                        <FileAddTwoTone className="upload-icon" />
                                    </Upload>
                                </Tooltip>
                                <Progress
                                    type="circle"
                                    percent={progressPercent}
                                    width={50}
                                    strokeColor={primaryColor}
                                    format={() => `${countNonEmptyAnswers()}/${singleSectionTextArea}`
                                    }
                                />

                            </div >
                        }
                        bordered
                    >
                        {
                            questions?.question?.map((q: any, idx: any) => {
                                return (
                                    <div key={`${questions.key}-${idx}`}>
                                        {renderQuestionInput(activeCategory, questions.key, q, idx, questions.question, questions.section)}
                                    </div>
                                );
                            })
                        }

                        < div className="subbutton" >
                            <div className="common-submit-btn">
                                <CustomButton
                                    label="Submit Answers"
                                    type="primary"
                                    onClick={(item: any) => handleSubmitAll(item)}
                                />
                            </div>
                        </div >

                    </Card >
                </div >
            </div >
            <Modal
                title="Unsaved Changes!!!"
                visible={isUnsavedModalVisible}
                onOk={() => {
                    setIsUnsavedModalVisible(false);
                    setHasUnsavedChanges(false);
                    if (pendingAction) pendingAction();
                }}
                onCancel={() => setIsUnsavedModalVisible(false)}
                okText="Yes"
                cancelText="No"
                centered
            >
                <div className="model-ques-content">Do You Want to Exit Without Saving?</div>
            </Modal>
        </div >
    );
};

export default SectionB;
