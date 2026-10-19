# Lesson 0's give-or-take data (#78): ionization energies from the cached NIST ASD
# export, electron affinities from Andersen, Haugen & Hotop (1999) Table 3.
from atoms.build import electron_affinity_file, ionization_file, read_asd

ROWS = read_asd()


def test_reads_every_ionization_energy_of_li_to_f_from_the_asd_export():
    assert [r["element"] for r in ROWS if r["charge"] == 0] == ["Li", "Be", "B", "C", "N", "O", "F"]
    carbon = [r for r in ROWS if r["element"] == "C"]
    assert [r["ie"] for r in carbon][:4] == [11.2602880, 24.383143, 47.88778, 64.49352]
    assert carbon[0]["shells"] == "1s2.2s2.2p2"


def test_give_is_the_sum_of_the_first_valence_ionization_energies():
    f = ionization_file(ROWS)
    v = f["values"]
    assert v["C.valence"]["value"] == 4 and v["F.valence"]["value"] == 7 and v["Li.valence"]["value"] == 1
    # 11.2602880 + 24.383143 + 47.88778 + 64.49352 (NIST ASD, eV)
    assert v["C.give"]["value"] == 148.024731
    assert v["C.give"]["unit"] == "eV" and v["C.give"]["quantity"] == "energy"
    assert v["Li.give"]["value"] == 5.391715
    assert "C.5" not in v and v["C.4"]["value"] == 64.49352
    citation = f["sources"][v["C.give"]["source"]]["citation"]
    assert citation.startswith("Kramida, A., Ralchenko, Yu., Reader, J., and NIST ASD Team (2024)")


def test_electron_affinities_only_where_the_anion_is_bound():
    f = electron_affinity_file()
    v = f["values"]
    assert {k: x["value"] for k, x in v.items()} == {
        "Li": 0.618049, "B": 0.279723, "C": 1.262118, "O": 1.461112, "F": 3.4011887,
    }
    citation = f["sources"]["andersen1999"]["citation"]
    assert "Andersen" in citation and "10.1063/1.556047" in citation
