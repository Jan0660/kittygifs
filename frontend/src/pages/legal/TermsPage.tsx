import { type Component } from "solid-js";
import "../../index.css";
import LegalMarkdownPage from "./LegalMarkdownPage";

const TermsPage: Component = () => <LegalMarkdownPage path="/legal/terms.md" title="Terms of Service" />;

export default TermsPage;