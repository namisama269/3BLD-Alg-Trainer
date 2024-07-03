import pandas as pd
import numpy as np

from cube_moves import comm_to_moves

uf_comms = {}
df = pd.read_csv("genAlgList/algcsv/UF.csv", header=None)
df_array = df.to_numpy()

# print(df_array)

for i in range(len(df_array)):
    for j in range(len(df_array)):
        if i == 0 or j == 0 or i == j:
            continue
        if not pd.isna(df_array[i][j]):
            uf_comms[f"{df_array[0][j]} {df_array[i][0]}"] = df_array[i][j]

# for k, v in uf_comms.items():
#     print(f"{k}: {v}")
# print(len(uf_comms))

targets = ["UB", "UL", "LU", "LF", "LD", "LB", "FR", "FD", "FL", "RB", "RD", "RF", "BU", "BL", "BD", "BR", "DF", "DR", "DB", "DL"]
flips = ["UB", "UL", "FR", "FL", "DF", "DB", "DR", "DL", "BR", "BL"]

for lt in targets:
    algs = []
    for ef in flips:
        # print(lt + " " + ef)
        try:
            algs.append(f"{uf_comms[lt + ' ' + ef]} + {uf_comms[ef[::-1] + ' ' + 'UR']}")
        except Exception as e:
            # print(e)
            pass
    s = f'"{lt}": ['
    s += ", ".join([f'"{alg}"' for alg in algs])
    s += "],"
    print(s)