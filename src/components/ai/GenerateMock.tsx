"use client";

import { useAi } from "@/hooks/use-ai";
import { useMediaQuery } from "@mantine/hooks";
import { useStore } from "zustand";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertTriangle, Download, Loader2, NotepadText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Document, PDFDownloadLink, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosResponse } from "axios";
import { TMockSchema } from "@/lib/schemas";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const GenerateMock = () => {
    const ai = useStore(useAi, (state) => state);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    if (!isDesktop) {
        return (
            <Drawer open={ai?.mock.isOpen} onOpenChange={ai?.onClose} onClose={ai?.mock.onClose}>
                <DrawerContent className="mt-0 max-h-[90vh] px-5 pb-10">
                    <DrawerHeader className="px-0">
                        <DrawerTitle>Generate Mock Tests</DrawerTitle>
                    </DrawerHeader>
                    <GenerateMock.Content />
                </DrawerContent>
            </Drawer>
        );
    }
    return (
        <Dialog open={ai?.mock.isOpen} onOpenChange={ai?.mock.onClose}>
            <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Generate Mock Tests</DialogTitle>
                    <DialogDescription>Generate important questions that may come in your exam.</DialogDescription>
                </DialogHeader>
                <GenerateMock.Content />
            </DialogContent>
        </Dialog>
    );
};

GenerateMock.Content = function GenerateMockContent() {
    const [type, setType] = useState<"midSem" | "endSem">("midSem");
    const [units, setUnits] = useState<Record<string, boolean>>({
        unit1: true,
        unit2: true,
        unit3: false,
        unit4: false,
    });
    const [error, setError] = useState<string | null>(null);

    const [data, setData] = useState<TMockSchema | undefined>(undefined);

    const ai = useStore(useAi, (state) => state);
    const params = useParams<{ slug: string[] }>();

    const { mutate, isPending } = useMutation({
        mutationKey: ["generate", "mock", type],
        mutationFn: async ({
            type,
            selectedUnits,
            topics,
        }: {
            type: "midSem" | "endSem";
            selectedUnits: Record<string, boolean>;
            topics: string[][];
        }) => {
            if (!ai?.toggle) {
                setError("Toggle Ai first!");
                return;
            }

            if (!ai?.key) {
                setError("Missing API Key!");
                return;
            }

            if (!ai?.model) {
                setError("Select model first!");
                return;
            }

            if (type === "midSem") {
                const selectedUnitCount = Object.values(selectedUnits).filter((value) => value).length;

                if (selectedUnitCount !== 2) {
                    throw new Error("Exactly two units must be selected for mid semester exam");
                }
            }

            const selectedTopics = Object.entries(selectedUnits)
                .map(([_, isSelected], index) => {
                    if (isSelected) {
                        return topics[index];
                    }
                    return null;
                })
                .filter((topic): topic is string[] => topic !== null);

            const response: AxiosResponse<TMockSchema, { error: string }> = await axios.post(
                ai?.model.includes("gemini") ? "/api/google-generate-mock" : "/api/openai-generate-mock",
                {
                    key: ai.key,
                    model: ai.model,
                    semester: params.slug[0],
                    branch: params.slug[1],
                    subject: params.slug[2],
                    type,
                    topics: selectedTopics,
                }
            );

            return response.data;
        },
        onSuccess: (data) => {
            setData(data);
        },
        onError: (error) => {
            if (axios.isAxiosError(error)) {
                if (error.response?.data?.error) {
                    setError(error.response.data.error as string);
                } else {
                    setError(error.message);
                }
            } else {
                setError(error instanceof Error ? error.message : "Something went wrong");
            }
        },
    });

    const handleUnits = (unit: string) => {
        setUnits((prev) => ({
            ...prev,
            [unit]: !units[unit],
        }));
    };

    if (!ai) return <></>;
    if (params.slug === undefined || !params.slug[0] || !params.slug[1] || !params.slug[2]) {
        return (
            <div className="flex items-center gap-2 rounded-md border border-border p-2">
                <div className="flex items-center justify-center rounded-md border border-border p-2">
                    <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold">No Subject Selected</p>
                    <p className="text-xs font-medium text-muted-foreground">
                        Please open a subject first then try to generate a mock test
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
                <div
                    role="button"
                    onClick={() => setType("midSem")}
                    className={cn(
                        "flex flex-col gap-1 rounded-md border border-border p-2 transition-colors hover:bg-accent hover:text-accent-foreground",
                        {
                            "border-primary": type === "midSem",
                        }
                    )}
                >
                    <div className="flex items-center gap-2">
                        <NotepadText className="h-5 w-4" />
                        <p className="text-sm font-semibold">Mid Sem</p>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                        The exam carries a total weightage of <span className="text-primary">30 marks</span>, consists
                        of <span className="text-primary">4 questions</span> covering{" "}
                        <span className="text-primary">2 units</span>, and has a duration of{" "}
                        <span className="text-primary">1.5 hours</span>.
                    </p>
                </div>
                <div
                    role="button"
                    onClick={() => setType("endSem")}
                    className={cn(
                        "flex flex-1 flex-col gap-1 rounded-md border border-border p-2 transition-colors hover:bg-accent hover:text-accent-foreground",
                        {
                            "border-primary": type === "endSem",
                        }
                    )}
                >
                    <div className="flex items-center gap-2">
                        <NotepadText className="h-5 w-4" />
                        <p className="text-sm font-semibold">End Sem</p>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                        The exam carries a total weightage of <span className="text-primary">75 marks</span>, consists
                        of <span className="text-primary">9 questions</span> covering{" "}
                        <span className="text-primary">4 units</span>, and has a duration of{" "}
                        <span className="text-primary">3 hours</span>.
                    </p>
                </div>
                <AnimatePresence mode="wait">
                    {type === "midSem" && (
                        <motion.div
                            initial={{ maxHeight: 0 }}
                            animate={{ maxHeight: "64px" }}
                            exit={{ maxHeight: 0 }}
                            transition={{ duration: 0.125 }}
                            className="flex flex-col gap-2 overflow-hidden transition-all"
                        >
                            <p className="text-sm font-semibold">Choose Units</p>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    onClick={() => handleUnits("unit1")}
                                    className="flex-1"
                                    size="sm"
                                    variant={units["unit1"] ? "secondary" : "outline"}
                                >
                                    Unit 1
                                </Button>
                                <Button
                                    onClick={() => handleUnits("unit2")}
                                    className="flex-1"
                                    size="sm"
                                    variant={units["unit2"] ? "secondary" : "outline"}
                                >
                                    Unit 2
                                </Button>
                                <Button
                                    onClick={() => handleUnits("unit3")}
                                    className="flex-1"
                                    size="sm"
                                    variant={units["unit3"] ? "secondary" : "outline"}
                                >
                                    Unit 3
                                </Button>
                                <Button
                                    onClick={() => handleUnits("unit4")}
                                    className="flex-1"
                                    size="sm"
                                    variant={units["unit4"] ? "secondary" : "outline"}
                                >
                                    Unit 4
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence mode="wait">
                    {!isPending && (
                        <motion.div
                            initial={{ maxHeight: 0 }}
                            animate={{ maxHeight: "42px" }}
                            exit={{ maxHeight: 0 }}
                            transition={{ duration: 0.125 }}
                            className={cn(
                                "flex items-center gap-2 overflow-hidden rounded-md border border-border p-1 transition-all",
                                {
                                    "bg-destructive text-destructive-foreground": error !== null,
                                }
                            )}
                        >
                            <div
                                className={cn("flex h-8 w-8 items-center justify-center rounded border border-border", {
                                    "border-white": error !== null,
                                })}
                            >
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <p className="text-xs font-medium">
                                {error === null ? "This is a highly experimental feature. May or may not work." : error}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex items-center gap-2">
                    <AnimatePresence mode="wait">
                        {!isPending && (
                            <motion.div
                                initial={{ maxWidth: 0 }}
                                animate={{ maxWidth: "230px" }}
                                exit={{ maxWidth: 0 }}
                                transition={{ exit: { duration: 0.2 } }}
                            >
                                <Button variant="outline" className="overflow-hidden" onClick={() => ai.mock.onClose()}>
                                    Cancel
                                </Button>
                            </motion.div>
                        )}
                        <Button
                            className="flex-1 gap-2"
                            disabled={isPending}
                            onClick={() => mutate({ type, selectedUnits: units, topics: ai.mock.topics })}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating
                                </>
                            ) : (
                                "Generate"
                            )}
                        </Button>

                        {data && (
                            <PDFDownloadLink
                                document={<MockExamPDF data={data} />}
                                fileName={`${data.output.examMetadata.subject}_${data.output.examMetadata.type}_${new Date().toLocaleString(
                                    "en-IN",
                                    {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                    }
                                )}_exam.pdf`}
                            >
                                {/* @ts-ignore */}
                                {({ blob, url, loading, error }) => {
                                    if (loading) {
                                        return (
                                            <Button disabled variant="outline" size="icon">
                                                <Loader2 className="h-4 w-4" />
                                            </Button>
                                        );
                                    }
                                    if (blob || url) {
                                        return (
                                            <Button variant="default" size="icon">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        );
                                    }
                                    if (error) {
                                        return (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button size="icon" variant="outline">
                                                            <AlertTriangle className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Couldn&apos;t create PDF.</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        );
                                    }
                                    return <></>;
                                }}
                            </PDFDownloadLink>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 12,
    },
    header: {
        marginBottom: 15,
        textAlign: "center",
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
    },
    metadata: {
        marginBottom: 15,
    },
    metadataRow: {
        flexDirection: "row",
        marginBottom: 5,
    },
    question: {
        marginBottom: 15,
    },
    questionHeader: {
        flexDirection: "row",
        marginBottom: 5,
    },
    subQuestion: {
        marginLeft: 20,
        marginBottom: 5,
    },
    watermark: {
        position: "absolute",
        top: 10,
        right: 30,
        fontSize: 8,
        color: "#666",
    },
});

const MockExamPDF = ({ data }: { data: TMockSchema }) => {
    const timestamp = new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {data.output.examMetadata.subject} -{" "}
                        {data.output.examMetadata.type === "midSem" ? "Mid Semester" : "End Semester"} Examination
                    </Text>
                </View>

                <View style={styles.metadata}>
                    <View style={styles.metadataRow}>
                        <Text>Total Marks: {data.output.examMetadata.totalMarks}</Text>
                    </View>
                    <View style={styles.metadataRow}>
                        <Text>Duration: {data.output.examMetadata.duration}</Text>
                    </View>
                    <View style={styles.metadataRow}>
                        <Text>
                            Questions to Attempt: {data.output.examMetadata.questionsToAttempt} out of{" "}
                            {data.output.examMetadata.totalQuestions}
                        </Text>
                    </View>
                </View>

                {data.output.questions.map((question) => (
                    <View key={question.questionNumber} style={styles.question}>
                        <View style={styles.questionHeader}>
                            <Text>Q{question.questionNumber}. </Text>
                            {question.isCompulsory && <Text>(Compulsory) </Text>}
                            {question.alternativeQuestionNumber && (
                                <Text>(OR Q{question.alternativeQuestionNumber}) </Text>
                            )}
                            <Text>[{question.totalMarks} Marks]</Text>
                        </View>

                        {question.content.map((subQ, idx) => (
                            <View key={idx} style={styles.subQuestion}>
                                <Text>
                                    {String.fromCharCode(97 + idx)}. {subQ.subQuestion} [{subQ.marks} Marks]
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}

                <Text style={styles.watermark}>Generated By SyllabusX on {timestamp}</Text>
            </Page>
        </Document>
    );
};

export default GenerateMock;
