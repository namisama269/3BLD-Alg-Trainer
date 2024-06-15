import pandas as pd # type: ignore
import re
import commutator

df = pd.read_csv("genAlgList/algcsv/2EO.csv", header=None)

for column_name in df.columns:
    # print(f"Column: {column_name}")

    values = []

    for j, value in enumerate(df[column_name]):
        if (pd.isna(value) or value == "#REF!"):
            continue

        # fix simultaneous UD moves
        value = value.replace("UD", "U D")
        value = value.replace("DU", "D U")
        value = value.replace("2D", "2 D")
        value = value.replace("2U", "2 U")
        value = value.replace("'D", "' D")
        value = value.replace("'U", "' U")
        value = value.replace("Rw", "r")
        value = value.replace("Lw", "l")
        value = value.replace("UE", "U E")
        value = value.replace("F'S", "F' S")
        value = value.replace("U'E", "U' E")
        value = value.replace("FS", "F S")
        value = value.replace("Mr", "M r")
        value = value.replace("MR", "M R")
        value = value.replace("M'r", "M' r")
        value = value.replace("M'R", "M' R")
        value = value.replace("RM", "R M")
        value = value.replace("rM", "r M")
        value = value.replace("rR", "r R")
        value = value.replace("Rr", "R r")
        value = value.replace("Ll", "L l")
        value = value.replace("lL", "l L")
        value = value.replace("Lr", "L r")
        value = value.replace("lR", "l R")
        value = value.replace("Rl", "R l")
        value = value.replace("rL", "r L")
        value = value.replace("", "")
        value = value.replace("", "")
        value = value.replace("", "")
        # value = value.replace("", "")
        # value = value.replace("", "")
        # value = value.replace("", "")
        # value = value.replace("", "")

        # split prime move + next move
        # value = re.sub(r"'(\S)", r"' \1", value)

        if j > 0:
            values.append(f"{value}!{commutator.finalReplaceAlg(value)}")
        else:
            values.append(value)


    s = f'"{values[0]}": ['
    s += ", ".join([f'"{value}"' for value in values[1:]])
    s += "],"
    print(s)
