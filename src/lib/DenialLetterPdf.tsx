import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { DenialLetter } from "./letter";

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingBottom: 54,
    paddingHorizontal: 54,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1f2933",
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#243b53",
    paddingBottom: 12,
    marginBottom: 24,
  },
  logo: { width: 48, height: 48, marginRight: 12, objectFit: "contain" },
  hoaName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#243b53" },
  subhead: { fontSize: 10, color: "#7b8794" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  block: { marginBottom: 14 },
  label: {
    fontSize: 9,
    color: "#7b8794",
    textTransform: "uppercase",
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  bold: { fontFamily: "Helvetica-Bold" },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    marginTop: 6,
  },
  rights: {
    backgroundColor: "#f7f9fb",
    borderLeftWidth: 3,
    borderLeftColor: "#243b53",
    padding: 12,
    marginVertical: 14,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 54,
    right: 54,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    fontSize: 8,
    color: "#7b8794",
  },
});

export function DenialLetterDocument({ letter }: { letter: DenialLetter }) {
  return (
    <Document
      title={`Denial Letter — ${letter.referenceNumber}`}
      author={letter.hoaName}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {letter.logoUrl ? (
            <Image style={styles.logo} src={letter.logoUrl} />
          ) : null}
          <View>
            <Text style={styles.hoaName}>{letter.hoaName}</Text>
            <Text style={styles.subhead}>Architectural Review Committee</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text>{letter.letterDate}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.bold}>{letter.ownerName}</Text>
          <Text>{letter.propertyAddress}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text>
            <Text style={styles.bold}>Re: </Text>
            Architectural Request {letter.referenceNumber} (
            {letter.requestTypeLabel})
          </Text>
        </View>

        <View style={styles.block}>
          <Text>Dear {letter.ownerName},</Text>
        </View>

        <View style={styles.block}>
          <Text>
            The Architectural Review Committee has reviewed your architectural
            modification request for the property at {letter.propertyAddress}.
            After careful consideration, the Committee has{" "}
            <Text style={styles.bold}>denied</Text> the request for the reasons
            stated below.
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.h2}>Specific reasons for denial</Text>
          <Text>{letter.reasons}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.h2}>
            Changes that would result in approval
          </Text>
          <Text>{letter.requiredChanges}</Text>
        </View>

        <View style={styles.rights}>
          <Text style={styles.bold}>Your right to a hearing</Text>
          <Text style={{ marginTop: 4 }}>{letter.rightsParagraph}</Text>
        </View>

        <View style={styles.block}>
          <Text>{letter.closingParagraph}</Text>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text>Sincerely,</Text>
          <Text style={{ marginTop: 18, ...styles.bold }}>
            Architectural Review Committee
          </Text>
          <Text>{letter.hoaName}</Text>
        </View>

        <Text style={styles.footer} fixed>
          This notice is provided under Texas Property Code §209.00505. This
          document assists with deadline tracking and does not constitute legal
          advice. Consult your association&apos;s attorney and governing
          documents.
          {letter.deliveryMethodLabel
            ? `  Delivery method: ${letter.deliveryMethodLabel}.`
            : ""}
        </Text>
      </Page>
    </Document>
  );
}
