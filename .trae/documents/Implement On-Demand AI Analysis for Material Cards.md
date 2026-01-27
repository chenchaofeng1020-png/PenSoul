I will modify the `MaterialAnalysisCard.jsx` component to implement the "on-demand analysis" flow.

**Plan:**

1.  **Remove Auto-Analysis**: Delete the `useEffect` hook that automatically triggers `handleAnalyze` when the card is expanded.
2.  **Implement On-Demand Trigger**:
    - In the expanded state, if no analysis exists yet, display a prominent "Start AI Deconstruction" button (instead of the previous small link).
    - Clicking this button will trigger the `handleAnalyze` function.
3.  **Display Full Content**:
    - Ensure that when the card is expanded, the original material content is displayed fully (removing `line-clamp` constraints), so users can read the raw material before deciding to analyze.
4.  **Show Results**:
    - Once analysis is complete, replace the button with the existing analysis result UI (Phenomenon, Sentiment, Connection Point).

This change ensures users focus on the raw content first and only consume AI tokens/time when they explicitly want to dig deeper into a specific material.