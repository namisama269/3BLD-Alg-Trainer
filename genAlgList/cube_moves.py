import re


move_offsets = ("", "2", "'")
move_dirs = "uUlLfFrRbBdDMES"
move_rots = "xyz"
move_others = "34w2'"
move_valid_chars = move_dirs + move_rots + move_others

def is_valid_move(move):
    # Check all chars in move string are valid possible moves
    if len(move) == 0:
        return False
    if not all(ch in move_valid_chars for ch in move):
        return False

    # Wide turn with more than 2 layers
    if move[0].isdigit():
        # 2 or less layer turns do not require a number 
        if move[0] in "012":
            return False
        # If a number is present, must use "w" to signal a wide turn
        if len(move) < 3 or move[2] != 'w':
            return False
        move = move[1:]
    
    # Check that the directional indicator is valid
    if len(move) == 0 or move[0] not in move_dirs:
        return False
    move_dir = move[0]
    move = move[1:]

    # Remaining suffixes are "'", "2" possibly with w before
    if move_dir not in "ULFRBD":
        if len(move) != 0 and move[0] not in move_offsets:
            return False
        elif len(move) != 0:
            move = move[1:]
    else:
        if len(move) != 0 and move[0] == 'w':
            move = move[1:]

    # Remaining part should be a move offset
    return move in move_offsets

def is_commutator(move_str):
    return ',' in move_str

def get_move_split_idx(move):
    idx = 0
    while idx < len(move) and move[idx] in move_valid_chars[:-2]:
        idx += 1
    return idx

def inverse_move(move):
    idx = get_move_split_idx(move)
    base = move[:idx]
    offset = move[idx:]
    return base + move_offsets[2-move_offsets.index(offset)]

def cancel_moves(move1, move2):
    idx1 = get_move_split_idx(move1)
    idx2 = get_move_split_idx(move2)

    base1 = move1[:idx1]
    base2 = move2[:idx2]
    if base1 != base2:
        return (False, move2)

    offset1 = move1[idx1:]
    offset2 = move2[idx2:]

    net_offset = (move_offsets.index(offset1) + move_offsets.index(offset2) + 2) % 4
    if net_offset == 0:
        return (True, None)
    else:
        return (True, base1 + move_offsets[net_offset-1])


def inverse_moves(move_str):
    move_str = move_str.split()
    return ' '.join(reversed([inverse_move(move) for move in move_str]))

def comm_to_moves(comm):
    comm = comm.replace('[', '').replace(']', '').strip()
    comm_list = [x.strip() for x in re.split(':|,', comm)]
    if len(comm_list) == 0:
        return ""

    move_str = comm_list[-2] + ' ' + comm_list[-1] + ' ' + inverse_moves(comm_list[-2]) + ' ' + inverse_moves(comm_list[-1])
    if len(comm_list) == 3:
        move_str = comm_list[0] + ' ' + move_str + ' ' + inverse_moves(comm_list[0])
    
    move_list = move_str.split()
    out_list = [move_list[0]]
    
    for i in range(1, len(move_list)):
        pop_prev, add_next = cancel_moves(move_list[i-1], move_list[i])
        if i > 1:
            pop_prev, add_next = cancel_moves(move_list[i-2], move_list[i])
        if pop_prev:
            out_list.pop()
        if add_next is not None:
            out_list.append(add_next)
    
    return ' '.join(out_list)


if __name__ == "__main__":
    comm = input()
    print(comm_to_moves(comm))